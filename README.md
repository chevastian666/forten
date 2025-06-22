# Self-Improvement Protocol System

A comprehensive framework for debugging, enhancing, and maintaining MCP (Model Context Protocol) tools with self-healing capabilities.

## Features

### 1. MCP Debugging Framework
- Automatic error detection and fixing
- Connection retry with exponential backoff
- Timeout handling and configuration
- Authentication issue resolution
- Comprehensive error logging

### 2. Tool Discovery & Integration
- Automatic tool discovery from multiple sources (API, Context7, Documentation)
- Dynamic tool integration
- Tool registry management
- Automatic code generation for new tools

### 3. Documentation Testing & Improvement
- Automated documentation validation
- Code example testing
- Performance note generation
- Test badge creation
- Automatic fix suggestions

### 4. Evaluation Testing Framework
- Test suite creation and management
- Parallel test execution
- Comprehensive reporting
- Performance metrics collection

### 5. Multi-Agent Verification
- Distributed verification system
- Multiple specialized agents (code, security, performance)
- Parallel verification execution
- Consensus-based decision making

### 6. Regression Test Generation
- Automatic test creation from failures
- Edge case testing
- Resolution validation
- Test suite organization

### 7. Self-Healing Patterns
- Connection retry with exponential backoff
- Circuit breaker pattern
- Fallback mechanisms
- Cache recovery
- Rate limiting
- Health checking

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```python
from self_improvement_protocol import SelfImprovementProtocol, Failure, FailureType

# Initialize the protocol
protocol = SelfImprovementProtocol()

# Handle a failure
failure = Failure(
    type=FailureType.MCP_ERROR,
    description="Connection timeout",
    context={"error": "TimeoutError", "target": "api_endpoint"}
)

result = await protocol.handle_failure(failure)

# Discover and add a missing tool
tool_result = await protocol.discover_and_add_tool("new_tool_name")

# Improve documentation
doc_result = await protocol.improve_documentation("docs/api.md")
```

## Architecture

The system consists of several interconnected modules:

1. **MCPDebugger**: Core debugging and fixing functionality
2. **ToolDiscovery**: Tool research and integration
3. **DocumentationTester**: Documentation validation and improvement
4. **EvaluationFramework**: Comprehensive testing system
5. **MultiAgentVerifier**: Distributed verification
6. **RegressionTestGenerator**: Automatic test generation
7. **SelfHealingPatterns**: Resilience patterns implementation
8. **SelfImprovementProtocol**: Main orchestrator

## Self-Healing Patterns

### Connection Retry
```python
@connection_retry(max_attempts=5)
async def api_call():
    return await make_request()
```

### Circuit Breaker
```python
circuit = CircuitBreaker(failure_threshold=5)
result = await circuit.call(api_function, *args)
```

### Fallback
```python
@with_fallback(cached_response)
async def live_api_call():
    return await fetch_data()
```

## Testing

Run the test suite:

```bash
pytest tests/
```

Run regression tests:

```bash
pytest tests/regression/
```

## Monitoring

The system provides comprehensive logging and monitoring:

- Debug logs: `mcp_debug.log`
- Tool registry: `tool_registry.json`
- Test results: Stored in memory and accessible via API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License