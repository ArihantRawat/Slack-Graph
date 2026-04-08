export function demoGraph() {
  return {
    generatedAt: new Date().toISOString(),
    me: "me",
    stats: {
      people: 6,
      relationships: 5,
      conversationsScanned: 12
    },
    nodes: [
      { id: "me", label: "You", handle: "you", kind: "self", score: 1 },
      { id: "u1", label: "Maya Chen", handle: "maya", kind: "person", score: 18 },
      { id: "u2", label: "Jordan Lee", handle: "jordan", kind: "person", score: 13 },
      { id: "u3", label: "Priya Shah", handle: "priya", kind: "person", score: 9 },
      { id: "u4", label: "Alex Kim", handle: "alex", kind: "person", score: 7 },
      { id: "u5", label: "Sam Rivera", handle: "sam", kind: "person", score: 4 }
    ],
    edges: [
      {
        id: "me:u1",
        source: "me",
        target: "u1",
        weight: 18,
        directMessages: 9,
        mentions: 2,
        sharedChannelSignals: 1,
        channels: ["DM with Maya Chen", "#product-launch"],
        reasons: ["9 direct messages", "2 mentions", "1 shared-channel signals"],
        relationship: {
          label: "Core collaborator",
          summary:
            "27 recent messages, 9 in DMs, and 1 shared channel signals. Reciprocity score: 88%."
        },
        topTopics: ["Launch Plan", "User Feedback", "Timeline Risks", "Beta Rollout", "Release Notes"]
      },
      {
        id: "me:u2",
        source: "me",
        target: "u2",
        weight: 13,
        directMessages: 5,
        mentions: 1,
        sharedChannelSignals: 2,
        channels: ["DM with Jordan Lee", "#design-ops"],
        reasons: ["5 direct messages", "1 mentions", "2 shared-channel signals"],
        relationship: {
          label: "Strong collaborator",
          summary:
            "19 recent messages, 5 in DMs, and 2 shared channel signals. Reciprocity score: 84%."
        },
        topTopics: ["Design Critique", "Copy Review", "Signup Flow", "Experiment Results", "Sprint Scope"]
      },
      {
        id: "me:u3",
        source: "me",
        target: "u3",
        weight: 9,
        directMessages: 0,
        mentions: 3,
        sharedChannelSignals: 3,
        channels: ["#weekly-review", "#product-launch"],
        reasons: ["3 mentions", "3 shared-channel signals"],
        relationship: {
          label: "Team channel partner",
          summary:
            "15 recent messages, 0 in DMs, and 3 shared channel signals. Reciprocity score: 79%."
        },
        topTopics: ["Weekly Review", "Metrics Trend", "Roadmap Tradeoffs", "Launch Readiness", "Customer Notes"]
      },
      {
        id: "me:u4",
        source: "me",
        target: "u4",
        weight: 7,
        directMessages: 2,
        mentions: 0,
        sharedChannelSignals: 2,
        channels: ["DM with Alex Kim", "#engineering"],
        reasons: ["2 direct messages", "2 shared-channel signals"],
        relationship: {
          label: "Occasional collaborator",
          summary:
            "11 recent messages, 2 in DMs, and 2 shared channel signals. Reciprocity score: 76%."
        },
        topTopics: ["Api Contract", "Bug Triage", "Infra Cost", "Build Pipeline", "Service Health"]
      },
      {
        id: "me:u5",
        source: "me",
        target: "u5",
        weight: 4,
        directMessages: 0,
        mentions: 1,
        sharedChannelSignals: 1,
        channels: ["#community"],
        reasons: ["1 mentions", "1 shared-channel signals"],
        relationship: {
          label: "Light connection",
          summary:
            "6 recent messages, 0 in DMs, and 1 shared channel signals. Reciprocity score: 64%."
        },
        topTopics: ["Community Event", "Partner Intro", "Outreach Copy", "Social Calendar", "Channel Feedback"]
      }
    ]
  };
}
