#!/usr/bin/env bun

/**
 * Agent Profile Loader
 *
 * Adapter for backward compatibility with SpawnAgentWithProfile.ts.
 * Wraps AgentContextLoader to provide the expected AgentProfileLoader interface.
 *
 * Note: The v1.0 YAML profile system is deprecated. This adapter ensures
 * existing code continues to work while using the v2.0 markdown context system.
 *
 * @see AgentProfileSystem.md for system documentation
 */

import { AgentContextLoader } from "./LoadAgentContext";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AgentProfile {
  name: string;
  modelPreference: "opus" | "sonnet" | "haiku";
  contextContent: string;
}

export interface LoadedProfile {
  profile: AgentProfile;
  fullPrompt: string;
}

export class AgentProfileLoader {
  private contextLoader: AgentContextLoader;
  private agentsDir: string;

  constructor() {
    this.contextLoader = new AgentContextLoader();
    this.agentsDir = join(homedir(), ".opencode", "skills", "Agents");
  }

  /**
   * Load profile for an agent type with task context
   * Adapts to the interface expected by SpawnAgentWithProfile.ts
   */
  async loadProfile(
    agentType: string,
    taskDescription: string,
    projectPath?: string
  ): Promise<LoadedProfile> {
    // Use the context loader under the hood
    const { prompt, model } = this.contextLoader.generateEnrichedPrompt(
      agentType,
      taskDescription
    );

    // If project path provided, append project context note
    let fullPrompt = prompt;
    if (projectPath) {
      fullPrompt += `\n\n---\n\n## Project Context\n\nWorking in: ${projectPath}`;
    }

    return {
      profile: {
        name: agentType,
        modelPreference: model,
        contextContent: this.contextLoader.loadContext(agentType).contextContent,
      },
      fullPrompt,
    };
  }

  /**
   * Get list of available agent profiles
   * Maps to context files (*Context.md)
   */
  getAvailableProfiles(): string[] {
    return this.contextLoader.getAvailableAgents();
  }

  /**
   * Check if a profile exists for an agent type
   */
  hasProfile(agentType: string): boolean {
    const contextPath = join(this.agentsDir, `${agentType}Context.md`);
    return existsSync(contextPath);
  }
}

// CLI usage for testing
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: AgentProfileLoader.ts <agentType> [taskDescription] [projectPath]");
    console.log("\nAvailable profiles:");
    const loader = new AgentProfileLoader();
    const profiles = loader.getAvailableProfiles();
    profiles.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }

  const [agentType, taskDescription, projectPath] = args;

  try {
    const loader = new AgentProfileLoader();

    if (!loader.hasProfile(agentType)) {
      console.error(`No profile found for agent type: ${agentType}`);
      process.exit(1);
    }

    const loaded = await loader.loadProfile(
      agentType,
      taskDescription || "Test task",
      projectPath
    );

    console.log("\n=== Agent Profile ===\n");
    console.log(`Name: ${loaded.profile.name}`);
    console.log(`Model: ${loaded.profile.modelPreference}`);
    console.log("\n=== Full Prompt ===\n");
    console.log(loaded.fullPrompt);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

export default AgentProfileLoader;
