import express from 'express';
import amqp from 'amqplib';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://app:changeme@localhost:5672/';
const EXCHANGE = process.env.ORCH_EXCHANGE || 'app.commands';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required for Orchestrator agent');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Orchestrator uses GPT-4o for high-context planning and agent coordination
const ORCHESTRATOR_MODEL = 'gpt-4o';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator Agent for an automated dropshipping platform. Your responsibilities:
1. Parse incoming commands from the Admin UI or other sources
2. Plan multi-step workflows (research → sourcing → listing → pricing → orders)
3. Coordinate specialized agents by publishing appropriate messages to RabbitMQ
4. Handle failures with retries and human escalation
5. Maintain workflow state and provide clear reasoning

When you receive a command, analyze it and respond with a JSON object containing:
- "plan": array of steps to execute
- "routing_keys": array of routing keys for each step
- "reasoning": brief explanation of your plan
- "requires_approval": boolean if human checkpoint needed

Be concise but thorough. Use domain knowledge about dropshipping workflows.`;

async function orchestratorReason(userCommand: string): Promise<any> {
  const response = await openai.chat.completions.create({
    model: ORCHESTRATOR_MODEL,
    messages: [
      { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
      { role: 'user', content: `Command: ${userCommand}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from Orchestrator model');
  return JSON.parse(content);
}

async function main(){
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({status: 'ok'}));

  app.post('/api/command', async (req, res) => {
    try {
      const userCommand = JSON.stringify(req.body);
      console.log('Orchestrator received command:', userCommand);

      // Use LLM to reason about the command and create execution plan
      const plan = await orchestratorReason(userCommand);
      console.log('Orchestrator plan:', JSON.stringify(plan, null, 2));

      const messageId = randomUUID();

      // Publish messages based on the plan
      if (plan.routing_keys && Array.isArray(plan.routing_keys)) {
        for (const routingKey of plan.routing_keys) {
          const payload = {
            message_id: messageId,
            timestamp: new Date().toISOString(),
            origin: 'orchestrator',
            plan,
            original_command: req.body
          };
          const sent = ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
          if (!sent) {
            console.error(`Failed to publish to ${routingKey}`);
          } else {
            console.log(`Published to ${routingKey}`);
          }
        }
      }

      return res.json({
        ok: true,
        message_id: messageId,
        plan,
      });
    } catch (error: any) {
      console.error('Orchestrator error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, () => console.log(`Orchestrator (LLM-powered) listening on ${port}`));
}

main().catch(err => { console.error(err); process.exit(1); });
