import { deployFunction, getOrCreateBucket, deploySite } from '@remotion/lambda';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const REGION = 'us-east-1';

async function deployRemotionLambda() {
  try {
    console.log('🚀 Deploying Remotion Lambda function...');
    
    // Step 1: Deploy the Lambda function
    const { functionName, alreadyExisted: functionAlreadyExisted } = await deployFunction({
      region: REGION,
      timeoutInSeconds: 900, // 15 minutes
      memorySizeInMb: 3008, // 3GB
      createCloudWatchLogGroup: true,
    });
    
    console.log(
      functionAlreadyExisted 
        ? `✅ Lambda function already exists: ${functionName}`
        : `✅ Lambda function deployed: ${functionName}`
    );
    
    // Step 2: Create or get S3 bucket
    console.log('🪣 Setting up S3 bucket...');
    const { bucketName, alreadyExisted: bucketAlreadyExisted } = await getOrCreateBucket({
      region: REGION,
    });
    
    console.log(
      bucketAlreadyExisted
        ? `✅ S3 bucket already exists: ${bucketName}`
        : `✅ S3 bucket created: ${bucketName}`
    );
    
    // Step 3: Deploy the site
    console.log('📦 Deploying Remotion site to S3...');
    const { serveUrl, siteName } = await deploySite({
      bucketName,
      entryPoint: path.resolve(process.cwd(), 'apps/video-render/src/index.ts'),
      region: REGION,
      siteName: 'video-editor-site',
    });
    
    console.log(`✅ Site deployed to: ${serveUrl}`);
    
    // Output configuration
    console.log('\n📋 Configuration for your application:');
    console.log('=====================================');
    console.log(`REMOTION_LAMBDA_FUNCTION_NAME=${functionName}`);
    console.log(`REMOTION_S3_BUCKET_NAME=${bucketName}`);
    console.log(`REMOTION_SITE_NAME=${siteName}`);
    console.log(`REMOTION_SERVE_URL=${serveUrl}`);
    console.log('=====================================');
    console.log('\nAdd these to your .env file or environment variables');
    
    // Save to .env.local for Next.js
    const envContent = `
# Remotion Lambda Configuration
REMOTION_LAMBDA_FUNCTION_NAME=${functionName}
REMOTION_S3_BUCKET_NAME=${bucketName}
REMOTION_SITE_NAME=${siteName}
REMOTION_SERVE_URL=${serveUrl}
`;
    
    const fs = await import('fs');
    const envPath = path.resolve(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      const existingContent = fs.readFileSync(envPath, 'utf-8');
      if (!existingContent.includes('REMOTION_LAMBDA_FUNCTION_NAME')) {
        fs.appendFileSync(envPath, envContent);
        console.log(`\n✅ Configuration appended to ${envPath}`);
      } else {
        console.log(`\n⚠️  Remotion configuration already exists in ${envPath}`);
        console.log('Please update it manually if needed.');
      }
    } else {
      fs.writeFileSync(envPath, envContent.trim());
      console.log(`\n✅ Configuration saved to ${envPath}`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deployRemotionLambda();