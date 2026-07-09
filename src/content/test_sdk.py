import asyncio
from google.antigravity import Agent, LocalAgentConfig

async def main():
    config = LocalAgentConfig(system_instructions="You are a helpful assistant.")
    async with Agent(config) as agent:
        response = await agent.chat("What is 2+2? Reply with just the number.")
        text = ""
        async for token in response:
            text += token
        print("Response:", text.strip())

if __name__ == "__main__":
    asyncio.run(main())
