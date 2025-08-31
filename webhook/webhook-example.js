// Example webhook endpoint for testing MorphPay webhooks
// You can run this with: node webhook-example.js

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

// Your webhook secret (set this in the MorphPay webhook config)
const WEBHOOK_SECRET = 'your-secret-key-here';

// Function to verify webhook signature
function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature-256'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const event = req.headers['x-webhook-event'];
  const rawBody = JSON.stringify(req.body);

  console.log('\n🔔 Webhook received!');
  console.log('Event:', event);
  console.log('Timestamp:', new Date(parseInt(timestamp)).toISOString());
  
  // Verify signature if secret is configured
  if (WEBHOOK_SECRET && signature) {
    if (!verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
      console.log('❌ Invalid signature!');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    console.log('✅ Signature verified');
  }

  const { event: eventType, transfer, metadata } = req.body;

  // Log the transfer details
  console.log('\n📦 Transfer Details:');
  console.log(`  ID: ${transfer.id}`);
  console.log(`  Status: ${transfer.status}`);
  console.log(`  Amount: ${transfer.amount} USDC`);
  console.log(`  From: ${transfer.sourceChain} → To: ${transfer.destinationChain}`);
  console.log(`  Recipient: ${transfer.recipient}`);
  console.log(`  Sender: ${transfer.sender}`);
  
  if (transfer.sourceTransactionHash) {
    console.log(`  Source TX: ${transfer.sourceTransactionHash}`);
  }
  
  if (transfer.destinationTransactionHash) {
    console.log(`  Destination TX: ${transfer.destinationTransactionHash}`);
  }

  if (transfer.messageHash) {
    console.log(`  Message Hash: ${transfer.messageHash}`);
  }

  // Log metadata if available
  if (metadata) {
    console.log('\n📊 Metadata:');
    if (metadata.progress !== undefined) {
      console.log(`  Progress: ${metadata.progress}%`);
    }
    if (metadata.estimatedCompletionTime) {
      console.log(`  ETA: ${new Date(metadata.estimatedCompletionTime).toISOString()}`);
    }
    if (metadata.error) {
      console.log(`  Error: ${metadata.error}`);
    }
    if (metadata.attestation) {
      console.log(`  Attestation: ${metadata.attestation.substring(0, 20)}...`);
    }
  }

  // Handle different event types
  switch (eventType) {
    case 'transfer.initiated':
      console.log('🚀 Transfer has been initiated');
      // You can add custom logic here, like:
      // - Send notification to user
      // - Log to database
      // - Update external system
      break;

    case 'transfer.burning':
      console.log('🔥 USDC is being burned on source chain');
      break;

    case 'transfer.attestation_pending':
      console.log('⏳ Waiting for Circle attestation');
      break;

    case 'transfer.ready_to_mint':
      console.log('✨ Ready to mint! Attestation received');
      break;

    case 'transfer.minting':
      console.log('⚡ Minting USDC on destination chain');
      break;

    case 'transfer.completed':
      console.log('🎉 Transfer completed successfully!');
      // Perfect time to notify user, update balances, etc.
      break;

    case 'transfer.failed':
      console.log('❌ Transfer failed');
      // Handle error, maybe retry or notify user
      break;

    default:
      console.log(`Unknown event type: ${eventType}`);
  }

  console.log('\n' + '='.repeat(50));

  // Respond with success
  res.status(200).json({ 
    success: true, 
    message: 'Webhook processed successfully',
    eventType,
    transferId: transfer.id
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.json({
    message: 'MorphPay Webhook Test Endpoint',
    webhookUrl: `http://localhost:${PORT}/webhook`,
    healthCheck: `http://localhost:${PORT}/health`,
    instructions: [
      '1. Start this server: node webhook-example.js',
      '2. Use ngrok to expose: ngrok http 3001',
      '3. Copy the ngrok URL and add /webhook',
      '4. Configure in MorphPay webhook settings',
      '5. Set secret to: your-secret-key-here (optional)'
    ]
  });
});

app.listen(PORT, () => {
  console.log('🎯 MorphPay Webhook Test Server');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔒 Secret: ${WEBHOOK_SECRET ? 'Configured' : 'Not set (optional)'}`);
  console.log('\n💡 To test with public URL:');
  console.log('   1. Install ngrok: npm install -g ngrok');
  console.log(`   2. Expose port: ngrok http ${PORT}`);
  console.log('   3. Use the ngrok URL in MorphPay webhook config');
  console.log('\nWaiting for webhooks...\n');
});

// Export for testing
module.exports = app;