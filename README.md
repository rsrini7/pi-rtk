# pi-rtk

Token reduction plugin for [pi-coding-agent](https://github.com/earendil-works/pi-coding-agent) that wraps commands with the external [RTK binary](https://github.com/rtk-ai/rtk) for **60-90% token savings**.

## Features

- **External RTK wrapping** - Wraps bash commands with the rtk binary (headroom can track savings)
- **Source Code Filtering** - Remove comments and normalize whitespace (minimal) or keep only signatures (aggressive)
- **Build Output Filtering** - Remove compilation noise, keep only errors and warnings
- **Test Output Aggregation** - Summarize test results, show failures only
- **Git Compaction** - Compact diffs, status, and log output
- **Search Result Grouping** - Group grep results by file with counts
- **Linter Aggregation** - Summarize lint errors by rule and file
- **ANSI Stripping** - Remove color codes and formatting
- **Smart Truncation** - Intelligently truncate large outputs

## Installation

```bash
# From npm
pi install npm:pi-rtk

# From GitHub
pi install git:rsrini7/pi-rtk

# Or add to ~/.pi/agent/settings.json
{
  "packages": ["npm:pi-rtk"]
}
```

## Configuration

Create `~/.pi/agent/rtk-config.json`:

```json
{
  "enabled": true,
  "logSavings": true,
  "showUpdateEvery": 10,
  "techniques": {
    "ansiStripping": true,
    "truncation": { "enabled": true, "maxChars": 10000 },
    "sourceCodeFiltering": { "enabled": true, "level": "minimal" },
    "smartTruncation": { "enabled": true, "maxLines": 200 },
    "testOutputAggregation": true,
    "buildOutputFiltering": true,
    "gitCompaction": true,
    "searchResultGrouping": true,
    "linterAggregation": true
  }
}
```

### Filter Levels

- `minimal`: Remove comments, normalize whitespace
- `aggressive`: Keep only signatures and structure

Source code filtering can be toggled independently of its level via commands or the `rtk_configure` tool.

## Commands

- `/rtk-stats` - Show token savings statistics
- `/rtk-on` / `/rtk-off` - Enable/disable token reduction
- `/rtk-clear` - Clear metrics history
- `/rtk-what` - Show current technique configuration
- `/rtk-toggle-ansiStripping` - Toggle ANSI stripping
- `/rtk-toggle-truncation` - Toggle output truncation
- `/rtk-toggle-sourceCodeFiltering` - Toggle source code filtering
- `/rtk-toggle-smartTruncation` - Toggle smart truncation
- `/rtk-toggle-testOutputAggregation` - Toggle test output aggregation
- `/rtk-toggle-buildOutputFiltering` - Toggle build output filtering
- `/rtk-toggle-gitCompaction` - Toggle git compaction
- `/rtk-toggle-searchResultGrouping` - Toggle search result grouping
- `/rtk-toggle-linterAggregation` - Toggle linter aggregation

## Agent Tool

The `rtk_configure` tool is registered for use by the AI agent to programmatically adjust any RTK parameter at runtime. This is particularly useful when file edits fail due to text-matching errors: the agent can temporarily disable `sourceCodeFiltering`, re-read the file, apply the edit, and re-enable filtering.

## Supported Languages

- TypeScript/JavaScript
- Python
- Rust
- Go
- Java
- C/C++

## Token Savings

| Output Type | Expected Savings |
|-------------|------------------|
| Source code | 60-90% (aggressive mode) |
| Build output | 70-90% |
| Test results | 50-80% |
| Git output | 60-80% |
| Search results | 40-60% |

## How It Works

### External RTK Binary (default)

When the external `rtk` binary is found in PATH, the plugin:

1. **`tool_call`** - Wraps bash commands with `rtk` before execution
2. **`tool_result`** - Skips in-process filtering (rtk binary handles it)

This allows headroom to track RTK savings via `rtk gain`.

### In-Process Fallback

If no external rtk binary is found, the plugin falls back to in-process filtering:

1. **`tool_result`** - Filters output after tool execution
2. Metrics tracked in `~/.pi/agent/rtk-metrics.json`

## Metrics

Metrics are persisted to `~/.pi/agent/rtk-metrics.json` and survive across sessions.

- `/rtk-stats` - Show current session and lifetime statistics
- `/rtk-clear` - Clear session metrics

## License

MIT - Based on the RTK specification
