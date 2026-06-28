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

### Prerequisites

1. Install [pi-coding-agent](https://github.com/earendil-works/pi-coding-agent)
2. Install [RTK binary](https://github.com/rtk-ai/rtk):
   ```bash
   # macOS
   brew install rtk-ai/tap/rtk
   
   # Or via cargo
   cargo install rtk
   ```

### Install pi-rtk

```bash
# Option 1: Install via pi (recommended)
pi install npm:@rsrini/pi-rtk

# Option 2: Add to ~/.pi/agent/settings.json
{
  "packages": ["npm:@rsrini/pi-rtk"]
}
```

## Quick Start

After installation, restart pi. The plugin automatically:
1. Detects the `rtk` binary in your PATH
2. Wraps bash commands with rtk before execution
3. Filters output for maximum token savings

```bash
# Start pi - rtk is automatically active
pi

# Check savings
/rtk-stats

# View current config
/rtk-what
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

## Commands

| Command | Description |
|---------|-------------|
| `/rtk-stats` | Show token savings statistics |
| `/rtk-on` | Enable token reduction |
| `/rtk-off` | Disable token reduction |
| `/rtk-what` | Show current configuration |
| `/rtk-clear` | Clear metrics history |
| `/rtk-toggle-*` | Toggle individual techniques |

## Agent Tool

The `rtk_configure` tool allows the AI agent to adjust settings at runtime. Useful when file edits fail due to text-matching errors.

## Token Savings

| Output Type | Expected Savings |
|-------------|------------------|
| Source code | 60-90% (aggressive mode) |
| Build output | 70-90% |
| Test results | 50-80% |
| Git output | 60-80% |
| Search results | 40-60% |

## How It Works

```
Bash command → RTK wraps → Execute → RTK filters → Pi processes
                     ↑                           ↑
              tool_call hook              tool_result hook
```

## Combining with Headroom

For maximum savings, combine with [pi-headroom](https://www.npmjs.com/package/@rsrini/pi-headroom):

```bash
pi install npm:@rsrini/pi-rtk
pi install npm:@rsrini/pi-headroom
```

Or use the `hpi` wrapper script (see [pi-headroom README](https://www.npmjs.com/package/@rsrini/pi-headroom)).

## License

MIT
