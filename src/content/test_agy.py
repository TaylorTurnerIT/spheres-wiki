import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig

async def main():
    config = LocalAgentConfig(
        system_instructions="You are a helpful assistant.",
        capabilities=CapabilitiesConfig(),
    )
    async with Agent(config) as agent:
        response = await agent.chat("Say hi")
        print("".join([t async for t in response]))

if __name__ == "__main__":
    asyncio.run(main())
