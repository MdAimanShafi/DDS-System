// ============================================
// MongoDB Cleanup Script
// Fix users with invalid riskScore
// ============================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function cleanupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 Finding users with invalid riskScore...');
    const users = await User.find({});
    
    let fixedCount = 0;
    
    for (const user of users) {
      let needsUpdate = false;
      
      // Fix riskScore if it's an object
      if (user.riskScore && typeof user.riskScore === 'object') {
        console.log(`⚠️  User ${user.email} has object riskScore:`, user.riskScore);
        user.riskScore = user.riskScore.score || 0;
        needsUpdate = true;
      }
      
      // Fix if riskScore is not a number
      if (typeof user.riskScore !== 'number') {
        console.log(`⚠️  User ${user.email} has invalid riskScore:`, user.riskScore);
        user.riskScore = 0;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await user.save();
        fixedCount++;
        console.log(`✅ Fixed user ${user.email} - riskScore now: ${user.riskScore}`);
      }
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Fixed users: ${fixedCount}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDatabase();
