# Human checkpoints (approvals) & API hooks

## Step-by-Step Implementation Guide

### Part 1: Understanding the Checkpoint System

#### Overview
Human checkpoints are critical control points where automated AI agent decisions require human review before execution. This prevents costly mistakes, fraud, and policy violations.

### Part 2: Setting Up the Checkpoint Database Schema

#### Step 1: Create Checkpoint Tables
1. Create migration for checkpoints table:
   ```sql
   CREATE TABLE checkpoints (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     type VARCHAR(50) NOT NULL,
     status VARCHAR(20) NOT NULL DEFAULT 'pending',
     priority VARCHAR(20) DEFAULT 'normal',
     payload JSONB NOT NULL,
     evidence JSONB,
     agent_name VARCHAR(100),
     confidence_score DECIMAL(3,2),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     ttl_expires_at TIMESTAMP,
     reviewed_by VARCHAR(100),
     reviewed_at TIMESTAMP,
     decision VARCHAR(20),
     decision_reason TEXT,
     metadata JSONB
   );

   CREATE INDEX idx_checkpoints_status ON checkpoints(status);
   CREATE INDEX idx_checkpoints_type ON checkpoints(type);
   CREATE INDEX idx_checkpoints_ttl ON checkpoints(ttl_expires_at) WHERE status = 'pending';
   CREATE INDEX idx_checkpoints_created ON checkpoints(created_at DESC);
   ```

2. Create enum types for better type safety:
   ```sql
   CREATE TYPE checkpoint_type AS ENUM (
     'sourcing_approval',
     'high_risk_listing',
     'large_order_review',
     'refund_approval',
     'supplier_onboarding'
   );

   CREATE TYPE checkpoint_status AS ENUM (
     'pending',
     'approved',
     'rejected',
     'escalated',
     'expired'
   );

   CREATE TYPE checkpoint_priority AS ENUM (
     'low',
     'normal',
     'high',
     'urgent'
   );
   ```

3. Run the migration:
   ```bash
   npm run migration:run
   ```

#### Step 2: Create Attachments Table (for Evidence)
```sql
CREATE TABLE checkpoint_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  filename VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_checkpoint ON checkpoint_attachments(checkpoint_id);
```

### Part 3: Implementing API Endpoints

#### Step 1: Create Checkpoint Service
1. Create file `src/checkpoints/checkpoint.service.ts`:
   ```typescript
   export class CheckpointService {
     async createCheckpoint(data: CreateCheckpointDto) {
       const ttlHours = process.env.HUMAN_CHECK_TTL_HOURS || 24;
       const checkpoint = await this.db.checkpoint.create({
         data: {
           ...data,
           status: 'pending',
           ttlExpiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
         },
       });
       
       // Notify admin team
       await this.notificationService.notifyNewCheckpoint(checkpoint);
       
       return checkpoint;
     }

     async approveCheckpoint(id: string, reviewerId: string, reason?: string) {
       const checkpoint = await this.db.checkpoint.update({
         where: { id },
         data: {
           status: 'approved',
           reviewedBy: reviewerId,
           reviewedAt: new Date(),
           decision: 'approved',
           decisionReason: reason,
         },
       });

       // Trigger next step in workflow
       await this.workflowService.continueWorkflow(checkpoint);
       
       return checkpoint;
     }

     async rejectCheckpoint(id: string, reviewerId: string, reason: string) {
       return await this.db.checkpoint.update({
         where: { id },
         data: {
           status: 'rejected',
           reviewedBy: reviewerId,
           reviewedAt: new Date(),
           decision: 'rejected',
           decisionReason: reason,
         },
       });
     }
   }
   ```

#### Step 2: Create REST API Endpoints
1. Create file `src/checkpoints/checkpoint.controller.ts`:
   ```typescript
   @Controller('api/admin/checkpoints')
   @UseGuards(AdminAuthGuard)
   export class CheckpointController {
     @Post()
     async createCheckpoint(@Body() dto: CreateCheckpointDto) {
       return await this.checkpointService.createCheckpoint(dto);
     }

     @Get()
     async listCheckpoints(@Query() query: ListCheckpointsDto) {
       const { status, type, page = 1, limit = 20 } = query;
       return await this.checkpointService.list({
         status,
         type,
         skip: (page - 1) * limit,
         take: limit,
       });
     }

     @Get(':id')
     async getCheckpoint(@Param('id') id: string) {
       return await this.checkpointService.findById(id);
     }

     @Post(':id/approve')
     async approveCheckpoint(
       @Param('id') id: string,
       @Body() dto: ApproveCheckpointDto,
       @CurrentUser() user: User,
     ) {
       return await this.checkpointService.approveCheckpoint(
         id,
         user.id,
         dto.reason,
       );
     }

     @Post(':id/reject')
     async rejectCheckpoint(
       @Param('id') id: string,
       @Body() dto: RejectCheckpointDto,
       @CurrentUser() user: User,
     ) {
       if (!dto.reason) {
         throw new BadRequestException('Reason is required for rejection');
       }
       return await this.checkpointService.rejectCheckpoint(
         id,
         user.id,
         dto.reason,
       );
     }
   }
   ```

### Part 4: Implementing Checkpoint Types

#### Step 1: Sourcing Selection Approval
1. When AI agent finds a supplier, create checkpoint:
   ```typescript
   const checkpoint = await checkpointService.createCheckpoint({
     type: 'sourcing_approval',
     agentName: 'SourcingAgent',
     confidenceScore: 0.85,
     payload: {
       supplierId: supplier.id,
       supplierName: supplier.name,
       productSku: product.sku,
       estimatedCost: 24.99,
       leadTimeDays: 14,
     },
     evidence: {
       supplierRating: 4.5,
       numberOfReviews: 1250,
       responseTime: '2 hours',
       sampleImages: ['url1', 'url2'],
       complianceChecks: {
         trademarkClear: true,
         restrictedCategory: false,
       },
     },
   });
   ```

#### Step 2: High-Risk Listing Approval
1. Flag listings that need review:
   ```typescript
   const riskScore = await calculateRiskScore(product);
   
   if (riskScore > RISK_THRESHOLD) {
     await checkpointService.createCheckpoint({
       type: 'high_risk_listing',
       priority: riskScore > 0.8 ? 'high' : 'normal',
       agentName: 'ListingAgent',
       confidenceScore: 1 - riskScore,
       payload: {
         productId: product.id,
         title: product.title,
         category: product.category,
         riskScore,
       },
       evidence: {
         trademarkMatches: await checkTrademarks(product),
         policyFlags: await checkPolicies(product),
         similarListings: await findSimilar(product),
         imageAnalysis: await analyzeImages(product.images),
       },
     });
   }
   ```

#### Step 3: Large Order Review
1. Intercept large orders:
   ```typescript
   @Injectable()
   export class OrderCheckpointInterceptor {
     async checkOrder(order: Order) {
       const threshold = parseFloat(process.env.LARGE_ORDER_THRESHOLD || '500');
       
       if (order.total >= threshold) {
         await this.checkpointService.createCheckpoint({
           type: 'large_order_review',
           priority: order.total > threshold * 2 ? 'high' : 'normal',
           payload: {
             orderId: order.id,
             orderNumber: order.number,
             total: order.total,
             itemCount: order.items.length,
             customerId: order.customerId,
           },
           evidence: {
             customerHistory: await this.getCustomerHistory(order.customerId),
             shippingRiskScore: await this.assessShippingRisk(order.shippingAddress),
             paymentRiskScore: await this.assessPaymentRisk(order.payment),
             unusualPatterns: await this.detectAnomalies(order),
           },
         });
         
         // Put order on hold
         await this.orderService.updateStatus(order.id, 'pending_review');
       }
     }
   }
   ```

#### Step 4: Refund Approval
```typescript
async requestRefundApproval(refund: RefundRequest) {
  const refundPercentage = (refund.amount / refund.originalAmount) * 100;
  
  if (refund.amount > 100 || refundPercentage > 50) {
    return await this.checkpointService.createCheckpoint({
      type: 'refund_approval',
      priority: refund.amount > 500 ? 'high' : 'normal',
      payload: {
        orderId: refund.orderId,
        refundAmount: refund.amount,
        originalAmount: refund.originalAmount,
        refundPercentage,
        customerReason: refund.reason,
      },
      evidence: {
        orderDetails: await this.getOrderDetails(refund.orderId),
        customerHistory: await this.getRefundHistory(refund.customerId),
        communicationLog: refund.messages,
      },
    });
  }
}
```

### Part 5: Building the Admin UI

#### Step 1: Create Checkpoint List View
1. Create component `admin/src/components/CheckpointList.tsx`:
   ```typescript
   export function CheckpointList() {
     const [checkpoints, setCheckpoints] = useState([]);
     const [filter, setFilter] = useState({ status: 'pending' });

     useEffect(() => {
       loadCheckpoints();
     }, [filter]);

     return (
       <div>
         <h1>Pending Approvals</h1>
         <FilterBar onChange={setFilter} />
         <Table>
           {checkpoints.map(cp => (
             <CheckpointRow key={cp.id} checkpoint={cp} />
           ))}
         </Table>
       </div>
     );
   }
   ```

#### Step 2: Create Checkpoint Detail View
1. Create component showing all evidence:
   ```typescript
   export function CheckpointDetail({ id }) {
     const checkpoint = useCheckpoint(id);

     return (
       <div>
         <Header checkpoint={checkpoint} />
         
         <Section title="Agent Recommendation">
           <AgentInfo 
             name={checkpoint.agentName}
             confidence={checkpoint.confidenceScore}
           />
         </Section>

         <Section title="Evidence">
           <EvidenceDisplay data={checkpoint.evidence} />
           <AttachmentList attachments={checkpoint.attachments} />
         </Section>

         <Section title="Decision">
           <ApprovalButtons
             onApprove={() => approveCheckpoint(id)}
             onReject={(reason) => rejectCheckpoint(id, reason)}
           />
         </Section>
       </div>
     );
   }
   ```

### Part 6: Implementing TTL and Escalation

#### Step 1: Create Background Job for Expired Checkpoints
1. Create cron job:
   ```typescript
   @Injectable()
   export class CheckpointExpirationJob {
     @Cron('*/15 * * * *') // Every 15 minutes
     async handleExpiredCheckpoints() {
       const expired = await this.db.checkpoint.findMany({
         where: {
           status: 'pending',
           ttlExpiresAt: { lte: new Date() },
         },
       });

       for (const checkpoint of expired) {
         await this.escalateCheckpoint(checkpoint);
       }
     }

     async escalateCheckpoint(checkpoint: Checkpoint) {
       await this.db.checkpoint.update({
         where: { id: checkpoint.id },
         data: { 
           status: 'escalated',
           priority: 'urgent',
         },
       });

       // Notify managers
       await this.notificationService.escalate(checkpoint);
     }
   }
   ```

### Part 7: Implementing Notifications

#### Step 1: Set Up Notification System
1. Create notification service:
   ```typescript
   @Injectable()
   export class CheckpointNotificationService {
     async notifyNewCheckpoint(checkpoint: Checkpoint) {
       const admins = await this.getAvailableAdmins();
       
       // Email notification
       await this.emailService.send({
         to: admins.map(a => a.email),
         subject: `New ${checkpoint.type} requires approval`,
         template: 'checkpoint-created',
         data: checkpoint,
       });

       // Slack notification
       await this.slackService.postMessage({
         channel: '#approvals',
         text: `New checkpoint: ${checkpoint.type}`,
         attachments: [{
           fields: [
             { title: 'Priority', value: checkpoint.priority },
             { title: 'Expires', value: checkpoint.ttlExpiresAt },
           ],
           actions: [
             { text: 'View', url: `${ADMIN_URL}/checkpoints/${checkpoint.id}` },
           ],
         }],
       });
     }
   }
   ```

### Part 8: Configuration and Environment Variables

#### Step 1: Set Environment Variables
Add to `.env`:
```env
# Checkpoint thresholds
LARGE_ORDER_THRESHOLD=500
HIGH_RISK_SCORE_THRESHOLD=0.7
REFUND_APPROVAL_THRESHOLD=100

# TTL settings
HUMAN_CHECK_TTL_HOURS=24
ESCALATION_TTL_HOURS=48

# Notification settings
ADMIN_NOTIFICATION_EMAIL=admin@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ADMIN_UI_URL=https://admin.yourdomain.com
```

### Part 9: Testing the Checkpoint System

#### Step 1: Create Test Data
```typescript
// Test script: scripts/test-checkpoint.ts
async function testCheckpointFlow() {
  // 1. Create checkpoint
  const checkpoint = await createCheckpoint({
    type: 'sourcing_approval',
    agentName: 'TestAgent',
    confidenceScore: 0.75,
    payload: { test: true },
  });

  console.log('Created checkpoint:', checkpoint.id);

  // 2. Retrieve checkpoint
  const retrieved = await getCheckpoint(checkpoint.id);
  console.log('Retrieved:', retrieved);

  // 3. Approve checkpoint
  const approved = await approveCheckpoint(checkpoint.id, 'test-admin');
  console.log('Approved:', approved);
}
```

#### Step 2: Test Each Checkpoint Type
1. Test sourcing approval flow
2. Test high-risk listing detection
3. Test large order interception
4. Test refund approval process
5. Verify TTL expiration and escalation

### Part 10: Audit and Compliance

#### Step 1: Implement Audit Logging
```typescript
@Injectable()
export class CheckpointAuditService {
  async logCheckpointAction(checkpoint: Checkpoint, action: string, user: string) {
    await this.db.auditLog.create({
      data: {
        entityType: 'checkpoint',
        entityId: checkpoint.id,
        action,
        userId: user,
        before: checkpoint,
        timestamp: new Date(),
      },
    });
  }
}
```

#### Step 2: Create Compliance Reports
```typescript
async generateComplianceReport(startDate: Date, endDate: Date) {
  return await this.db.checkpoint.groupBy({
    by: ['type', 'decision'],
    where: {
      reviewedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });
}
```

## Why checkpoints
Certain actions are high-risk (sourcing suppliers, high-value listings, refunds). Human approvals reduce fraud, policy violations, and high-cost mistakes.

## Key checkpoint types
- Sourcing selection approval: when Research/SourcingAgent recommends a new supplier or SKU for listing.
- High-risk listing approval: flagged for restricted categories, trademark risk, or negative compliance signals.
- Large-order review: orders over `LARGE_ORDER_THRESHOLD` (env var) require manual review.
- Refund/chargeback approval: refunds above a percentage or amount require manager sign-off.

## Evidence to show in Admin UI
- Supplier dossier: supplier name, lead time, sample photos, tracking history, contact record
- Product risk signals: ASIN/brand matches, images, text match scores, policy flags
- Order details: customer history, shipping address risk score, payment risk score
- Audit log of automated agent rationale & data (Research results, confidence scores)

## API endpoints (examples)
- `POST /api/admin/checkpoints` — create checkpoint (body includes `type`, `payload`, `agent`, `confidence`)
- `GET /api/admin/checkpoints/{id}` — fetch details + attachments
- `POST /api/admin/checkpoints/{id}/approve` — approve (requires admin token)
- `POST /api/admin/checkpoints/{id}/reject` — reject with reason

## Workflow tips
- Each checkpoint carries a TTL; auto-escalate if not reviewed in `X` hours.
- Store original agent output as immutable evidence for audits.
- Keep approvals idempotent and record approver identity + timestamp.

Checkpoint thresholds (env):
- `LARGE_ORDER_THRESHOLD=500` (USD)
- `HUMAN_CHECK_TTL_HOURS=24`

These checkpoints are required for compliance and merchant trust; surface clear, concise evidence and a quick approve/reject action in the Admin UI.