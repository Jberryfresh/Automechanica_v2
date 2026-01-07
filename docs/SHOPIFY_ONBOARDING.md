# Shopify dev store & app onboarding

## Step-by-Step Setup Instructions

### Part 1: Shopify Partner Account Setup

#### Step 1: Create Shopify Partner Account
1. Go to [shopify.com/partners](https://www.shopify.com/partners)
2. Click "Join now" or "Sign up"
3. Fill in your information:
   - Email address
   - Password
   - Business name (can be your name initially)
4. Verify your email address by clicking the link sent to your inbox
5. Complete your partner profile

#### Step 2: Navigate to Partner Dashboard
1. Log in to [partners.shopify.com](https://partners.shopify.com)
2. Familiarize yourself with the dashboard sections:
   - Apps: Manage your applications
   - Stores: Development and managed stores
   - Themes: If building themes
   - Payouts: Earnings tracking

### Part 2: Create Development Store

#### Step 1: Create New Development Store
1. From Partner Dashboard, click "Stores" in the left sidebar
2. Click "Add store" button
3. Select "Development store"
4. Fill in store information:
   - **Store name**: Choose a descriptive name (e.g., "automechanica-dev")
   - **Store URL**: Will be `your-name.myshopify.com`
   - **Store purpose**: Select "Test an app or theme"
   - **Login information**: Set email and password for store admin
5. Click "Create development store"
6. Wait for store to be created (usually takes 1-2 minutes)

#### Step 2: Access Your Development Store
1. From the Stores page, click on your new store
2. Click "Log in" to access the store admin
3. You'll be taken to the Shopify admin dashboard
4. Note your store URL: `your-store.myshopify.com`

#### Step 3: Add Sample Data (Optional but Recommended)
1. In the Shopify admin, go to "Settings" → "Store details"
2. Scroll down to find "Sample data"
3. Click "Add sample products" and "Add sample customers"
4. This creates test data for development

#### Step 4: Configure Store Settings
1. Go to "Settings" → "General"
2. Set store currency and timezone
3. Add store address (can be fake for development)
4. Go to "Settings" → "Payments"
5. Enable "Shopify Payments" in test mode (if available in your region)
   - Or enable "Bogus Gateway" for testing
6. Go to "Settings" → "Checkout"
7. Configure checkout settings as needed

### Part 3: Creating a Shopify App

#### Step 1: Decide on App Type
**Custom App (Private)** - Recommended for initial development:
- Easier to set up
- Direct access token
- No OAuth flow needed
- Cannot be distributed

**Public App** - For distribution:
- Requires OAuth
- Can be listed in Shopify App Store
- More complex setup

For this guide, we'll use **Custom App** initially.

#### Step 2: Create Custom App
1. In your development store admin, go to "Settings"
2. Click "Apps and sales channels"
3. Click "Develop apps"
4. If prompted, click "Allow custom app development"
5. Click "Create an app"
6. Enter app name: `Automechanica`
7. Select app developer (yourself)
8. Click "Create app"

#### Step 3: Configure API Scopes
1. Click on your newly created app
2. Go to "Configuration" tab
3. Click "Configure" under "Admin API integration"
4. Select the required scopes:

   **Product Scopes:**
   - `write_products` - Create/update products
   - `read_products` - Read product data

   **Order Scopes:**
   - `write_orders` - Create/update orders
   - `read_orders` - Read order data

   **Inventory Scopes:**
   - `write_inventory` - Manage inventory levels
   - `read_inventory` - Read inventory data

   **Customer Scopes (if needed):**
   - `read_customers` - Read customer data
   - `write_customers` - Create/update customers

   **Additional Scopes:**
   - `read_locations` - Read store locations
   - `read_shipping` - Read shipping information
   - `write_fulfillments` - Create fulfillments (if auto-fulfilling)

5. Click "Save" at the bottom

#### Step 4: Install the App
1. After saving scopes, go to "API credentials" tab
2. Click "Install app" button
3. Review the permissions
4. Click "Install" to confirm
5. You'll see a success message

#### Step 5: Get API Credentials
1. On the "API credentials" tab, you'll now see:
   - **Admin API access token** - Click "Reveal token once" and **save this immediately**
   - **API key** - Save this
   - **API secret key** - Save this
2. Store these securely (we'll add to `.env` file later)

⚠️ **IMPORTANT**: The access token is only shown once. If you lose it, you'll need to uninstall and reinstall the app.

#### Step 6: Note Your Store Domain
Your store domain is in format: `your-store.myshopify.com`

### Part 4: Environment Variable Configuration

#### Step 1: Create or Update .env File
1. In your project root, create or open `.env` file
2. Add the following environment variables:
   ```env
   # Shopify Configuration
   SHOPIFY_SHOP=your-store.myshopify.com
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_API_VERSION=2025-04
   
   # Webhook Configuration
   SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
   SHOPIFY_WEBHOOK_URL=https://your-domain.com/api/webhooks/shopify
   ```

3. Replace placeholder values with your actual credentials
4. Save the file

#### Step 2: Verify .env is in .gitignore
1. Open `.gitignore`
2. Ensure it contains:
   ```
   .env
   .env.local
   .env.*.local
   ```

### Part 5: Webhook Setup

#### Step 1: Expose Local Webhook Endpoint with ngrok
1. Install ngrok if not already installed:
   ```bash
   # Windows (using chocolatey)
   choco install ngrok
   
   # Or download from ngrok.com
   ```

2. Start your application:
   ```bash
   npm run start:dev
   ```

3. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Note the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`)

#### Step 2: Register Webhooks in Shopify
1. You can register webhooks via API or manually in Shopify admin

**Option A: Via Shopify Admin**
1. In your store admin, go to "Settings" → "Notifications"
2. Scroll to "Webhooks"
3. Click "Create webhook"
4. Configure webhook:
   - **Event**: Select event type (e.g., "Order creation")
   - **Format**: JSON
   - **URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/shopify`
   - **API version**: 2025-04
5. Click "Save"

**Option B: Via API (Recommended for multiple webhooks)**
1. Create a script `scripts/setup-webhooks.ts`:
   ```typescript
   import Shopify from '@shopify/shopify-api';

   const webhooks = [
     { topic: 'orders/create', address: '/api/webhooks/shopify' },
     { topic: 'orders/paid', address: '/api/webhooks/shopify' },
     { topic: 'products/create', address: '/api/webhooks/shopify' },
     { topic: 'products/update', address: '/api/webhooks/shopify' },
     { topic: 'app/uninstalled', address: '/api/webhooks/shopify' },
   ];

   async function setupWebhooks() {
     const baseUrl = process.env.SHOPIFY_WEBHOOK_URL || 'https://your-ngrok-url.ngrok.io';
     
     for (const webhook of webhooks) {
       const response = await fetch(
         `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-04/webhooks.json`,
         {
           method: 'POST',
           headers: {
             'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             webhook: {
               topic: webhook.topic,
               address: `${baseUrl}${webhook.address}`,
               format: 'json',
             },
           }),
         }
       );
       
       const data = await response.json();
       console.log(`Created webhook for ${webhook.topic}:`, data.webhook.id);
     }
   }

   setupWebhooks();
   ```

2. Run the script:
   ```bash
   ts-node scripts/setup-webhooks.ts
   ```

#### Step 3: Implement Webhook Verification
1. Create webhook handler `src/webhooks/shopify.controller.ts`:
   ```typescript
   import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
   import { Request, Response } from 'express';
   import crypto from 'crypto';

   @Controller('api/webhooks/shopify')
   export class ShopifyWebhookController {
     @Post()
     async handleWebhook(
       @Req() req: Request,
       @Res() res: Response,
       @Headers('x-shopify-hmac-sha256') hmac: string,
       @Headers('x-shopify-topic') topic: string,
     ) {
       // Verify webhook
       const verified = this.verifyWebhook(req.body, hmac);
       
       if (!verified) {
         return res.status(401).send('Unauthorized');
       }

       // Process webhook based on topic
       await this.processWebhook(topic, req.body);
       
       return res.status(200).send('OK');
     }

     private verifyWebhook(body: any, hmac: string): boolean {
       const hash = crypto
         .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
         .update(JSON.stringify(body), 'utf8')
         .digest('base64');
       
       return hash === hmac;
     }

     private async processWebhook(topic: string, data: any) {
       switch (topic) {
         case 'orders/create':
           await this.handleOrderCreated(data);
           break;
         case 'orders/paid':
           await this.handleOrderPaid(data);
           break;
         case 'products/create':
         case 'products/update':
           await this.handleProductChange(data);
           break;
         case 'app/uninstalled':
           await this.handleAppUninstalled(data);
           break;
       }
     }
   }
   ```

### Part 6: Testing API Integration

#### Step 1: Test Product Creation
1. Create test script `scripts/test-product-creation.ts`:
   ```typescript
   async function createTestProduct() {
     const response = await fetch(
       `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-04/products.json`,
       {
         method: 'POST',
         headers: {
           'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           product: {
             title: 'AI-Generated Test Widget',
             body_html: '<strong>This is a test product</strong>',
             vendor: 'Automechanica',
             product_type: 'Widgets',
             variants: [
               {
                 price: '24.99',
                 sku: 'TEST-WIDGET-001',
                 inventory_quantity: 100,
               },
             ],
           },
         }),
       }
     );

     const data = await response.json();
     console.log('Created product:', data.product);
     return data.product;
   }

   createTestProduct();
   ```

2. Run the test:
   ```bash
   ts-node scripts/test-product-creation.ts
   ```

3. Verify in Shopify admin:
   - Go to "Products"
   - You should see your new product

#### Step 2: Test Product Retrieval
```typescript
async function getProducts() {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-04/products.json?limit=10`,
    {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
      },
    }
  );

  const data = await response.json();
  console.log('Products:', data.products);
}
```

#### Step 3: Test Order Creation
```typescript
async function createTestOrder() {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-04/orders.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order: {
          line_items: [
            {
              variant_id: YOUR_VARIANT_ID,
              quantity: 1,
            },
          ],
          customer: {
            email: 'test@example.com',
          },
          financial_status: 'paid',
        },
      }),
    }
  );

  const data = await response.json();
  console.log('Created order:', data.order);
}
```

### Part 7: Installing Shopify SDK

#### Step 1: Install Official Shopify Libraries
```bash
npm install @shopify/shopify-api
npm install @shopify/shopify-app-express  # if using Express
```

#### Step 2: Initialize Shopify SDK
1. Create `src/shopify/shopify.config.ts`:
   ```typescript
   import '@shopify/shopify-api/adapters/node';
   import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

   export const shopify = shopifyApi({
     apiKey: process.env.SHOPIFY_API_KEY!,
     apiSecretKey: process.env.SHOPIFY_API_SECRET!,
     scopes: [
       'write_products',
       'read_products',
       'write_orders',
       'read_orders',
       'write_inventory',
       'read_customers',
     ],
     hostName: process.env.SHOPIFY_SHOP!.replace('https://', ''),
     apiVersion: LATEST_API_VERSION,
     isEmbeddedApp: false,
     isCustomStoreApp: true,
   });
   ```

#### Step 3: Create Shopify Service
```typescript
@Injectable()
export class ShopifyService {
  private client: any;

  constructor() {
    this.client = new shopify.clients.Rest({
      session: {
        shop: process.env.SHOPIFY_SHOP!,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
      },
    });
  }

  async createProduct(productData: any) {
    const response = await this.client.post({
      path: 'products',
      data: { product: productData },
    });
    return response.body.product;
  }

  async getProducts(limit = 50) {
    const response = await this.client.get({
      path: 'products',
      query: { limit },
    });
    return response.body.products;
  }
}
```

### Part 8: Verification Checklist

#### Complete Setup Checklist
Run through this checklist to ensure everything is configured:

- [ ] **Partner Account**
  - [ ] Shopify Partner account created and verified
  - [ ] Partner dashboard accessible

- [ ] **Development Store**
  - [ ] Dev store created
  - [ ] Store domain noted: `____________.myshopify.com`
  - [ ] Can log into store admin
  - [ ] Sample data added (optional)

- [ ] **App Credentials**
  - [ ] Custom app created
  - [ ] API scopes configured (minimum: products, orders)
  - [ ] App installed to dev store
  - [ ] Access token saved securely
  - [ ] API key saved
  - [ ] API secret saved

- [ ] **Environment Configuration**
  - [ ] `.env` file created with all Shopify variables
  - [ ] `.env` added to `.gitignore`
  - [ ] Environment variables loaded in application

- [ ] **Webhooks**
  - [ ] ngrok installed and running (for local development)
  - [ ] Webhook endpoint implemented
  - [ ] Webhook verification working (HMAC check)
  - [ ] At least one webhook registered and tested

- [ ] **API Testing**
  - [ ] Successfully created a test product via API
  - [ ] Successfully retrieved products via API
  - [ ] Webhook received and verified (test by creating product in Shopify admin)

- [ ] **Security**
  - [ ] No credentials committed to Git
  - [ ] Access token stored securely
  - [ ] Webhook HMAC verification implemented

### Part 9: Common Issues and Troubleshooting

#### Issue 1: "API access is not enabled for this store"
**Solution**: Ensure you've enabled custom app development in Settings → Apps and sales channels → Develop apps

#### Issue 2: Webhook verification failing
**Solution**: 
- Check that you're using raw body for HMAC calculation
- Verify `SHOPIFY_API_SECRET` is correct
- Ensure body is stringified before hashing

#### Issue 3: 401 Unauthorized errors
**Solution**:
- Verify `SHOPIFY_ACCESS_TOKEN` is correct
- Check that app has required scopes
- Ensure token hasn't been revoked

#### Issue 4: ngrok URL changes on restart
**Solution**:
- Get a free ngrok account for a persistent URL
- Or update webhooks each time ngrok restarts

#### Issue 5: Rate limiting errors
**Solution**:
- Implement request throttling
- Use bulk operations where possible
- Check rate limit headers and implement backoff

### Part 10: Next Steps

#### Production Considerations
1. **Move from Custom App to Public App** (if distributing):
   - Set up OAuth flow
   - Implement app installation flow
   - Handle session management

2. **Implement Proper Error Handling**:
   - Retry logic for API calls
   - Webhook failure handling
   - Rate limit management

3. **Set Up Production Webhooks**:
   - Use production domain instead of ngrok
   - Ensure HTTPS is properly configured
   - Set up webhook failure monitoring

4. **Security Hardening**:
   - Rotate API credentials regularly
   - Implement IP whitelisting if possible
   - Set up monitoring and alerts

## 1) Create a Shopify development store
- Sign in to your Shopify Partner account and create a new development store for testing.
- Note the store domain (e.g. `my-store.myshopify.com`) — export this to `SHOPIFY_SHOP`.

## 2) App types & recommended scopes
- For early MVP use a Custom App (private-like) for simplicity or OAuth app if you plan to distribute.
- Required OAuth / Admin API scopes (min):
  - `write_products`, `read_products`
  - `write_orders`, `read_orders`
  - `read_customers`, `write_customers`
  - `write_inventory` (if syncing inventory)
  - `write_script_tags` or `write_themes` only if injecting frontend code
- Use minimal scopes initially; request additional scopes with an approval step.

## 3) Create the app & API keys
- In Shopify Admin → Apps → Develop apps → Create app → Configure API credentials.
- Save: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and if using a custom app, `SHOPIFY_ACCESS_TOKEN`.
- Env variables to set:
  - `SHOPIFY_SHOP=my-store.myshopify.com`
  - `SHOPIFY_API_KEY=your_key`
  - `SHOPIFY_API_SECRET=your_secret`
  - `SHOPIFY_ACCESS_TOKEN=access_token_for_custom_app`

## 4) Webhook setup & verification
- Recommended webhooks: `orders/create`, `orders/paid`, `products/create`, `products/update`, `app/uninstalled`.
- For each webhook POST to your endpoint `POST /api/webhooks/shopify`.
- Verify using HMAC (header `X-Shopify-Hmac-Sha256`) with `SHOPIFY_API_SECRET`.
- Test webhook verification locally using ngrok and `SHOPIFY_WEBHOOK_URL` env var.

## 5) Test webhook verification (node curl-style)
- Example verification curl (create product via Admin API):

```bash
curl -X POST "https://my-store.myshopify.com/admin/api/2025-04/products.json" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product": {"title": "Test AI Product", "body_html": "<strong>Test</strong>", "variants": [{"price":"19.99"}]}}'
```

## 6) Sample publish product (REST) — curl
```bash
curl -X POST "https://$SHOPIFY_SHOP/admin/api/2025-04/products.json" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product":{"title":"AI Widget","body_html":"Auto-created","variants":[{"price":"24.99"}]}}'
```

## 7) Checklist
- [ ] Dev store created and domain in `SHOPIFY_SHOP`
- [ ] App credentials saved (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_ACCESS_TOKEN`)
- [ ] OAuth flow tested (if public app)
- [ ] Webhooks registered and HMAC verification passing
- [ ] Example product creation tested via curl
- [ ] Permissions limited to minimum required scopes

Notes: use API version pinning (e.g. `2025-04`) and rotate keys regularly.