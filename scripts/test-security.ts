import { validateMessage, detectPII } from '../lib/security';

console.log("Running Security Logic Tests...\n");

const tests = [
    {
        name: "PII Detection - Phone (US format)",
        input: "Call me at (555) 123-4567",
        expectedPII: true
    },
    {
        name: "PII Detection - Phone (Simple)",
        input: "My number is 555-123-4567",
        expectedPII: true
    },
    {
        name: "PII Detection - Email",
        input: "Email me at test@example.com",
        expectedPII: true
    },
    {
        name: "Safe content",
        input: "Hello, is this property still available?",
        expectedPII: false
    },
    {
        name: "Safe content with numbers",
        input: "I have a budget of $500,000",
        expectedPII: false
    }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
    const isPII = detectPII(test.input);
    const result = validateMessage(test.input);

    // Check if PII detection matches expectation
    if (isPII === test.expectedPII) {
        console.log(`✅ ${test.name}: Passed`);
        passed++;
    } else {
        console.error(`❌ ${test.name}: Failed (Expected PII: ${test.expectedPII}, Got: ${isPII})`);
        failed++;
    }

    // Double check validateMessage output consistency
    if (test.expectedPII && result.isValid) {
        console.error(`   ❌ ${test.name}: validateMessage should have returned invalid due to PII`);
    }
});

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
