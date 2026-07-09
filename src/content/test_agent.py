import asyncio
from google.antigravity import Agent, LocalAgentConfig

async def main():
    config = LocalAgentConfig(system_instructions="You are a helpful assistant. Reply with only the summary.")
    async with Agent(config) as agent:
        response = await agent.chat("Summarize this: A feat that lets you gain a tumor familiar like the alchemist discovery.")
        async for token in response:
            print(token, end="", flush=True)
        print()

if __name__ == "__main__":
    asyncio.run(main())
