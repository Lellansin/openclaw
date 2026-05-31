// Shared OpenAI-compatible `tool_choice` contract for the Chat Completions
// (`/v1/chat/completions`) and Responses (`/v1/responses`) HTTP endpoints. Both
// accept `required` and pinned-function choices, narrow the exposed client
// tools, nudge the model with a system prompt, and must reject a turn that omits
// the demanded structured tool call. Keeping the constraint shape, prompt
// wording, and satisfaction check here keeps the two endpoints from drifting.

export type ToolChoiceConstraint = { type: "required" } | { type: "function"; name: string };

export function toolChoiceConstraintPrompt(constraint: ToolChoiceConstraint): string {
  return constraint.type === "function"
    ? `You must call the ${constraint.name} tool before responding.`
    : "You must call one of the available tools before responding.";
}

// True when no constraint is active, or the agent produced a structured tool
// call that honors it: any call for `required`, a name match for a pinned
// function. Callers reject the turn when this returns false.
export function isToolChoiceConstraintSatisfied(params: {
  constraint: ToolChoiceConstraint | undefined;
  pendingToolCalls: ReadonlyArray<{ name: string }> | undefined;
}): boolean {
  const { constraint, pendingToolCalls } = params;
  if (!constraint) {
    return true;
  }
  if (!pendingToolCalls || pendingToolCalls.length === 0) {
    return false;
  }
  if (constraint.type === "required") {
    return true;
  }
  return pendingToolCalls.some((call) => call.name === constraint.name);
}

export function resolveUnsatisfiedToolChoiceMessage(constraint: ToolChoiceConstraint): string {
  return constraint.type === "function"
    ? `tool_choice required a ${constraint.name} tool call, but the agent did not produce one`
    : "tool_choice=required was not satisfied by the agent response";
}
