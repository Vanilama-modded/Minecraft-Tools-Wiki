# Minecraft Tools Wiki – Extender's Guide

## 1. How to add a new tool

### Method 1: Edit the tools.json file 
Simply edit the `tools.json` file and add your new tool in the following format:

```json
{
    "tool": "Your Tool Category",
    "description": "Description of what the tool does",
    "links": [
        { "url": "https://example.com/tool1", "name": "Tool Name 1" },
        { "url": "https://example.com/tool2", "name": "Tool Name 2" }
    ],
    "price": "Free"
}

