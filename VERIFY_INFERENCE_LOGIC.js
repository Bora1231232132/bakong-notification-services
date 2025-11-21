// Quick verification script for bakongPlatform inference logic
// Run with: node VERIFY_INFERENCE_LOGIC.js

const BakongApp = {
  BAKONG: 'BAKONG',
  BAKONG_JUNIOR: 'BAKONG_JUNIOR',
  BAKONG_TOURIST: 'BAKONG_TOURIST',
}

function inferBakongPlatform(participantCode, accountId) {
  // First try participantCode
  if (participantCode) {
    const code = participantCode.toUpperCase()
    if (code.startsWith('BKRT')) {
      return BakongApp.BAKONG
    }
    if (code.startsWith('BKJR')) {
      return BakongApp.BAKONG_JUNIOR
    }
    if (code.startsWith('TOUR')) {
      return BakongApp.BAKONG_TOURIST
    }
  }

  // Then try accountId domain
  if (accountId) {
    const lowerAccountId = accountId.toLowerCase()
    if (lowerAccountId.includes('@bkrt') || lowerAccountId.endsWith('@bkrt')) {
      return BakongApp.BAKONG
    }
    if (lowerAccountId.includes('@bkjr') || lowerAccountId.endsWith('@bkjr')) {
      return BakongApp.BAKONG_JUNIOR
    }
    if (lowerAccountId.includes('@tour') || lowerAccountId.endsWith('@tour')) {
      return BakongApp.BAKONG_TOURIST
    }
  }

  return undefined
}

// Test Cases
console.log('🧪 Testing bakongPlatform Inference Logic\n')
console.log('=' .repeat(60))

// Test 1: participantCode with BKRT
console.log('\n✅ Test 1: participantCode = "BKRTKHPPXXX"')
const result1 = inferBakongPlatform('BKRTKHPPXXX', 'user@test')
console.log(`   Result: ${result1}`)
console.log(`   Expected: ${BakongApp.BAKONG}`)
console.log(`   ${result1 === BakongApp.BAKONG ? '✅ PASS' : '❌ FAIL'}`)

// Test 2: participantCode with BKJR
console.log('\n✅ Test 2: participantCode = "BKJRKHPPXXX"')
const result2 = inferBakongPlatform('BKJRKHPPXXX', 'user@test')
console.log(`   Result: ${result2}`)
console.log(`   Expected: ${BakongApp.BAKONG_JUNIOR}`)
console.log(`   ${result2 === BakongApp.BAKONG_JUNIOR ? '✅ PASS' : '❌ FAIL'}`)

// Test 3: participantCode with TOUR
console.log('\n✅ Test 3: participantCode = "TOURKHPPXXX"')
const result3 = inferBakongPlatform('TOURKHPPXXX', 'user@test')
console.log(`   Result: ${result3}`)
console.log(`   Expected: ${BakongApp.BAKONG_TOURIST}`)
console.log(`   ${result3 === BakongApp.BAKONG_TOURIST ? '✅ PASS' : '❌ FAIL'}`)

// Test 4: accountId with @bkrt
console.log('\n✅ Test 4: accountId = "user@bkrt" (no participantCode)')
const result4 = inferBakongPlatform(undefined, 'user@bkrt')
console.log(`   Result: ${result4}`)
console.log(`   Expected: ${BakongApp.BAKONG}`)
console.log(`   ${result4 === BakongApp.BAKONG ? '✅ PASS' : '❌ FAIL'}`)

// Test 5: accountId with @bkjr
console.log('\n✅ Test 5: accountId = "user@bkjr" (no participantCode)')
const result5 = inferBakongPlatform(undefined, 'user@bkjr')
console.log(`   Result: ${result5}`)
console.log(`   Expected: ${BakongApp.BAKONG_JUNIOR}`)
console.log(`   ${result5 === BakongApp.BAKONG_JUNIOR ? '✅ PASS' : '❌ FAIL'}`)

// Test 6: accountId with @tour
console.log('\n✅ Test 6: accountId = "user@tour" (no participantCode)')
const result6 = inferBakongPlatform(undefined, 'user@tour')
console.log(`   Result: ${result6}`)
console.log(`   Expected: ${BakongApp.BAKONG_TOURIST}`)
console.log(`   ${result6 === BakongApp.BAKONG_TOURIST ? '✅ PASS' : '❌ FAIL'}`)

// Test 7: participantCode priority over accountId
console.log('\n✅ Test 7: participantCode = "BKRT123", accountId = "user@bkjr"')
const result7 = inferBakongPlatform('BKRT123', 'user@bkjr')
console.log(`   Result: ${result7}`)
console.log(`   Expected: ${BakongApp.BAKONG} (participantCode takes priority)`)
console.log(`   ${result7 === BakongApp.BAKONG ? '✅ PASS' : '❌ FAIL'}`)

// Test 8: No match
console.log('\n✅ Test 8: participantCode = "UNKNOWN123", accountId = "user123"')
const result8 = inferBakongPlatform('UNKNOWN123', 'user123')
console.log(`   Result: ${result8}`)
console.log(`   Expected: undefined`)
console.log(`   ${result8 === undefined ? '✅ PASS' : '❌ FAIL'}`)

// Test 9: Real examples from database
console.log('\n✅ Test 9: Real examples from your database')
console.log('   Example: accountId = "vandoeurn_pin1@bkrt"')
const result9 = inferBakongPlatform(undefined, 'vandoeurn_pin1@bkrt')
console.log(`   Result: ${result9}`)
console.log(`   Expected: ${BakongApp.BAKONG}`)
console.log(`   ${result9 === BakongApp.BAKONG ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n   Example: accountId = "john_wick@bkjr"')
const result10 = inferBakongPlatform(undefined, 'john_wick@bkjr')
console.log(`   Result: ${result10}`)
console.log(`   Expected: ${BakongApp.BAKONG_JUNIOR}`)
console.log(`   ${result10 === BakongApp.BAKONG_JUNIOR ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n   Example: participantCode = "BKRTKHPPXXX", accountId = "user@bkrt"')
const result11 = inferBakongPlatform('BKRTKHPPXXX', 'user@bkrt')
console.log(`   Result: ${result11}`)
console.log(`   Expected: ${BakongApp.BAKONG}`)
console.log(`   ${result11 === BakongApp.BAKONG ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n' + '='.repeat(60))
console.log('✅ All inference logic tests completed!')
console.log('\n📝 Summary:')
console.log('   - participantCode takes priority over accountId')
console.log('   - BKRT* → BAKONG')
console.log('   - BKJR* → BAKONG_JUNIOR')
console.log('   - TOUR* → BAKONG_TOURIST')
console.log('   - *@bkrt → BAKONG')
console.log('   - *@bkjr → BAKONG_JUNIOR')
console.log('   - *@tour → BAKONG_TOURIST')

