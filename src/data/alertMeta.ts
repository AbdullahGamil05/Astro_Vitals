import type { UnifiedAlert } from "./monitoring";

/** Related metric and next-step guidance for the static demo alerts in operations.ts. */
export const staticAlertMeta: Record<string, { relatedMetric: UnifiedAlert["relatedMetric"]; recommendedAction: string }> = {
  al1: {
    relatedMetric: "spo2",
    recommendedAction: "Flight surgeon to contact the crew member now, verify sensor placement and check cabin atmosphere readouts.",
  },
  al2: {
    relatedMetric: "heartRate",
    recommendedAction: "Flight surgeon to assess promptly. Crew member should stop strenuous activity and report any chest discomfort.",
  },
  al3: {
    relatedMetric: "temperature",
    recommendedAction: "Take a manual temperature reading, keep hydrated and review symptoms with the flight surgeon.",
  },
  al4: {
    relatedMetric: "spo2",
    recommendedAction: "Review the trend with the crew member, confirm sensor fit and schedule a follow-up check.",
  },
  al5: {
    relatedMetric: "sleep",
    recommendedAction: "Review sleep schedule and workload, and consider a rest adjustment. Follow up at the next assessment.",
  },
  al6: {
    relatedMetric: "environment",
    recommendedAction: "No action needed. Continue to monitor ambient CO2 levels.",
  },
  al7: {
    relatedMetric: "environment",
    recommendedAction: "Log fluid intake and drink to the daily target.",
  },
  al8: {
    relatedMetric: "activity",
    recommendedAction: "No action needed. Keep up the exercise routine.",
  },
};
