#!/usr/bin/env python3
"""
Example usage of the Self-Improvement Protocol System
Demonstrates all major features and patterns
"""

import asyncio
import json
from datetime import datetime
from self_improvement_protocol import (
    SelfImprovementProtocol,
    Failure,
    FailureType,
    TestCase
)


async def demonstrate_mcp_debugging():
    """Demonstrate MCP debugging and fixing"""
    print("\n=== MCP Debugging Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Simulate different types of failures
    failures = [
        Failure(
            type=FailureType.MCP_ERROR,
            description="Connection refused to MCP server",
            context={
                "error_type": "connection",
                "traceback": "ConnectionRefusedError: [Errno 111] Connection refused",
                "host": "localhost",
                "port": 8080,
                "target": "mcp_server"
            }
        ),
        Failure(
            type=FailureType.MCP_ERROR,
            description="Authentication failed",
            context={
                "error_type": "authentication",
                "traceback": "AuthenticationError: Invalid API key",
                "endpoint": "/api/v1/auth",
                "target": "auth_service"
            }
        ),
        Failure(
            type=FailureType.MCP_ERROR,
            description="Request timeout",
            context={
                "error_type": "timeout",
                "traceback": "TimeoutError: Request timed out after 30 seconds",
                "operation": "data_fetch",
                "target": "data_service"
            }
        )
    ]
    
    for failure in failures:
        print(f"\nHandling: {failure.description}")
        result = await protocol.handle_failure(failure)
        print(f"Resolution: {result['steps'][0]['result']['solution']}")
        print(f"Self-healing pattern: {result['steps'][3]['result']['pattern']}")


async def demonstrate_tool_discovery():
    """Demonstrate tool discovery and integration"""
    print("\n=== Tool Discovery Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Discover tools from different sources
    tools_to_discover = [
        ("json_validator", "api"),
        ("markdown_parser", "context7"),
        ("code_formatter", "docs")
    ]
    
    for tool_name, source in tools_to_discover:
        print(f"\nDiscovering tool: {tool_name} from {source}")
        
        # First, discover the tool
        tool_info = await protocol.tool_discovery.discover_tool(tool_name, source)
        print(f"Discovered: {json.dumps(tool_info, indent=2)}")
        
        # Then integrate it
        if tool_info:
            integration_success = await protocol.tool_discovery.integrate_tool(tool_info)
            print(f"Integration successful: {integration_success}")


async def demonstrate_documentation_testing():
    """Demonstrate documentation testing and improvement"""
    print("\n=== Documentation Testing Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Create a sample documentation file
    sample_doc = """# API Documentation

## Example Usage

```python
import numpy as np

# This will fail without proper import
result = calculate_sum([1, 2, 3])
print(result)
```

```python
# This example has a syntax error
def broken_function(
    print("Hello")
```

```python
# This example is correct
def working_function():
    return "Success"

print(working_function())
```
"""
    
    # Write sample documentation
    doc_path = "sample_api_docs.md"
    with open(doc_path, 'w') as f:
        f.write(sample_doc)
    
    # Test and improve documentation
    print(f"\nTesting documentation: {doc_path}")
    result = await protocol.improve_documentation(doc_path)
    
    print(f"Test results: {json.dumps(result['test_results'], indent=2)}")
    print(f"Improved documentation saved to: {result['improved']}")


async def demonstrate_evaluation_framework():
    """Demonstrate evaluation testing framework"""
    print("\n=== Evaluation Framework Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Create test suites
    test_suites = {
        "api_tests": [
            TestCase(
                name="test_connection",
                input_data={"endpoint": "/health", "method": "GET"},
                expected_output={"status": "healthy"}
            ),
            TestCase(
                name="test_authentication",
                input_data={"api_key": "valid_key", "action": "authenticate"},
                expected_output={"authenticated": True}
            ),
            TestCase(
                name="test_data_fetch",
                input_data={"query": "SELECT * FROM users", "limit": 10},
                expected_output={"success": True, "count": 10}
            )
        ],
        "integration_tests": [
            TestCase(
                name="test_end_to_end",
                input_data={"workflow": "complete", "steps": ["auth", "fetch", "process"]},
                expected_output={"completed": True}
            )
        ]
    }
    
    # Create and run test suites
    for suite_name, test_cases in test_suites.items():
        protocol.evaluator.create_test_suite(suite_name, test_cases)
    
    # Run all evaluations
    print("\nRunning evaluation tests...")
    report = await protocol.evaluator.run_evaluation()
    
    print(f"\nEvaluation Report:")
    print(f"Total tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['total_passed']}")
    print(f"Failed: {report['summary']['total_failed']}")
    print(f"Pass rate: {report['summary']['overall_pass_rate']:.2%}")
    
    if report['recommendations']:
        print("\nRecommendations:")
        for rec in report['recommendations']:
            print(f"- {rec}")


async def demonstrate_multi_agent_verification():
    """Demonstrate multi-agent verification"""
    print("\n=== Multi-Agent Verification Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Simulate code changes to verify
    changes = [
        {
            "type": "code_security",
            "file": "auth_handler.py",
            "description": "Updated authentication logic",
            "diff": """
+def authenticate(username, password):
+    # Hash password before comparison
+    hashed = hash_password(password)
+    return check_credentials(username, hashed)
"""
        },
        {
            "type": "performance_code",
            "file": "data_processor.py",
            "description": "Optimized data processing",
            "diff": """
-for item in data:
-    process_item(item)
+# Process in parallel
+await asyncio.gather(*[process_item(item) for item in data])
"""
        }
    ]
    
    for change in changes:
        print(f"\nVerifying change: {change['description']}")
        verification = await protocol.verifier.verify_change(change)
        
        print(f"Verified: {verification['verified']}")
        print(f"Confidence: {verification['confidence']:.2%}")
        print(f"Agents involved: {verification['agent_count']}")
        
        if verification['issues']:
            print("Issues found:")
            for issue in verification['issues']:
                print(f"- {issue['agent']}: {issue['check']} - {issue['details']}")


async def demonstrate_self_healing_patterns():
    """Demonstrate self-healing patterns"""
    print("\n=== Self-Healing Patterns Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Apply different patterns
    patterns_to_apply = [
        ("connection_retry", "database_connect"),
        ("circuit_breaker", "external_api_call"),
        ("fallback", "weather_service"),
        ("cache_recovery", "user_preferences"),
        ("rate_limiter", "api_endpoint"),
        ("health_check", "microservice")
    ]
    
    for pattern_name, target in patterns_to_apply:
        print(f"\nApplying {pattern_name} pattern to {target}")
        result = await protocol.self_healing.apply_pattern(pattern_name, target)
        print(f"Pattern applied: {result['pattern']}")
        print(f"Target: {result['target']}")
        # Show first few lines of implementation
        impl_lines = result['implementation'].split('\n')[:10]
        print("Implementation preview:")
        for line in impl_lines:
            if line.strip():
                print(f"  {line}")


async def demonstrate_regression_testing():
    """Demonstrate regression test generation"""
    print("\n=== Regression Test Generation Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Create failures to generate tests from
    failures = [
        Failure(
            type=FailureType.RUNTIME_ERROR,
            description="Null pointer exception in user service",
            context={
                "error": "NullPointerException",
                "input": {"user_id": None},
                "expected": "User object",
                "stack_trace": "at UserService.getUser(UserService.py:42)"
            }
        ),
        Failure(
            type=FailureType.VALIDATION_ERROR,
            description="Invalid email format accepted",
            context={
                "error": "ValidationError",
                "input": {"email": "not-an-email"},
                "expected": "Email validation failure",
                "actual": "Email accepted"
            },
            resolved=True,
            resolution="Added email regex validation"
        )
    ]
    
    # Generate regression tests
    for failure in failures:
        print(f"\nGenerating regression test for: {failure.description}")
        test_file = protocol.regression_generator.generate_from_failure(failure)
        print(f"Test generated: {test_file}")
        
        # Show test preview
        with open(test_file, 'r') as f:
            lines = f.readlines()[:20]
            print("Test preview:")
            for line in lines:
                print(line.rstrip())
    
    # Generate complete test suite
    print("\n\nGenerating complete regression test suite...")
    suite_file = protocol.regression_generator.generate_test_suite(failures)
    print(f"Test suite created: {suite_file}")


async def demonstrate_complete_workflow():
    """Demonstrate complete self-improvement workflow"""
    print("\n=== Complete Workflow Demo ===")
    
    protocol = SelfImprovementProtocol()
    
    # Simulate a real-world scenario
    print("\nScenario: API endpoint failing with timeout errors")
    
    # 1. Create failure
    failure = Failure(
        type=FailureType.MCP_ERROR,
        description="API endpoint /data/fetch timing out",
        context={
            "error_type": "timeout",
            "endpoint": "/data/fetch",
            "timeout": 30,
            "traceback": "TimeoutError: Request exceeded 30s timeout",
            "frequency": "10 times in last hour",
            "target": "data_fetch_endpoint"
        }
    )
    
    print("\n1. Failure detected:")
    print(f"   Type: {failure.type.value}")
    print(f"   Description: {failure.description}")
    
    # 2. Handle through protocol
    print("\n2. Applying self-improvement protocol...")
    result = await protocol.handle_failure(failure)
    
    # 3. Show results
    print("\n3. Results:")
    for step in result['steps']:
        print(f"\n   {step['step'].upper()}:")
        if step['step'] == 'debug':
            print(f"   - Issue: {step['result']['issue']}")
            print(f"   - Solution: {step['result']['solution']}")
        elif step['step'] == 'verify':
            print(f"   - Verified: {step['result']['verified']}")
            print(f"   - Confidence: {step['result']['confidence']:.2%}")
        elif step['step'] == 'regression_test':
            print(f"   - Test file: {step['result']}")
        elif step['step'] == 'self_healing':
            print(f"   - Pattern: {step['result']['pattern']}")
        elif step['step'] == 'evaluation':
            print(f"   - Pass rate: {step['result']['summary']['overall_pass_rate']:.2%}")
    
    print("\n4. System is now self-healed and monitored!")


async def main():
    """Run all demonstrations"""
    demos = [
        ("MCP Debugging", demonstrate_mcp_debugging),
        ("Tool Discovery", demonstrate_tool_discovery),
        ("Documentation Testing", demonstrate_documentation_testing),
        ("Evaluation Framework", demonstrate_evaluation_framework),
        ("Multi-Agent Verification", demonstrate_multi_agent_verification),
        ("Self-Healing Patterns", demonstrate_self_healing_patterns),
        ("Regression Testing", demonstrate_regression_testing),
        ("Complete Workflow", demonstrate_complete_workflow)
    ]
    
    print("Self-Improvement Protocol System - Examples")
    print("=" * 50)
    
    for name, demo_func in demos:
        print(f"\n{'=' * 50}")
        print(f"Running: {name}")
        print('=' * 50)
        
        try:
            await demo_func()
        except Exception as e:
            print(f"\nError in {name}: {e}")
            import traceback
            traceback.print_exc()
        
        # Small delay between demos
        await asyncio.sleep(0.5)
    
    print("\n" + "=" * 50)
    print("All demonstrations completed!")
    print("=" * 50)


if __name__ == "__main__":
    # Create necessary directories
    import os
    os.makedirs("tests/regression", exist_ok=True)
    os.makedirs("integrations", exist_ok=True)
    
    # Run demonstrations
    asyncio.run(main())