import amqp from 'amqplib';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://app:changeme@localhost:5672/';
const EXCHANGE = process.env.ORCH_EXCHANGE || 'app.commands';
const QUEUE = process.env.WORKER_QUEUE || 'app.worker.sourcing';
const ROUTING_KEY = process.env.ROUTING_KEY || 'sourcing.request';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required for Worker agents');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Worker agents use gpt-4o-mini for fast, cost-effective task execution
const WORKER_MODEL = 'gpt-4o-mini';

const SOURCING_AGENT_PROMPT = `You are the SourcingAgent for a dropshipping platform. Your job:
1. Analyze product specifications from the request
2. Identify potential suppliers (simulate with mock data for now)
3. Evaluate suppliers based on: cost, lead time, reliability, MOQ
4. Return a recommendation with reasoning

Respond with JSON containing:
- "suppliers": array of {supplier_id, name, unit_cost, lead_time_days, reliability_score}
- "recommendation": {supplier_id, reason}
- "requires_approval": boolean (true if uncertain or high-risk)
- "confidence": 0-1 score

Use realistic mock supplier data for testing.`;

async function processSourcingTask(task: any): Promise<any> {
  const taskStr = JSON.stringify(task);
  
  const response = await openai.chat.completions.create({
    model: WORKER_MODEL,
    messages: [
      { role: 'system', content: SOURCING_AGENT_PROMPT },
      { role: 'user', content: `Task: ${taskStr}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from SourcingAgent model');
  return JSON.parse(content);
}

async function main(){
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  console.log(`SourcingAgent (LLM-powered) waiting for messages on ${QUEUE} (routing ${ROUTING_KEY})`);

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const content = msg.content.toString();
      const task = JSON.parse(content);
      console.log('SourcingAgent received task:', content);

      // Use LLM to analyze and process the sourcing request
      const result = await processSourcingTask(task);
      console.log('SourcingAgent result:', JSON.stringify(result, null, 2));

      // TODO: persist result to database and publish response event
      // For now, just log the intelligent agent response

      ch.ack(msg);
    } catch (err) {
      console.error('SourcingAgent processing error:', err);
      ch.nack(msg, false, false); // send to DLQ
    }
  }, { noAck: false });
}

main().catch(err => { console.error(err); process.exit(1); });
