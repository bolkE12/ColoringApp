import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  eventName: string;
  timestamp: number;
  data?: Record<string, any>;
}

interface AnalyticsSummary {
  totalEvents: number;
  eventCounts: Record<string, number>;
  mostCreatedAnimals: Record<string, number>;
  mostUsedColors: Record<string, number>;
  toolUsage: { fill: number; brush: number };
  screenViews: Record<string, number>;
  lastSevenDaysEvents: number;
  conversionFunnel: {
    homeViews: number;
    createViews: number;
    coloringViews: number;
    saveCompleted: number;
  };
}

class LocalAnalytics {
  private static STORAGE_KEY = '@local_analytics_events';
  private static MAX_EVENTS = 1000; // Keep last 1000 events

  /**
   * Track an analytics event
   * @param eventName Name of the event (e.g., 'screen_view', 'animal_created')
   * @param data Optional data associated with the event
   */
  static async trackEvent(eventName: string, data?: Record<string, any>): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        eventName,
        timestamp: Date.now(),
        data,
      };

      // Get existing events
      const eventsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

      // Add new event
      events.push(event);

      // Keep only last N events to avoid storage issues
      if (events.length > this.MAX_EVENTS) {
        events.shift();
      }

      // Save back
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('[LocalAnalytics] Failed to track event:', error);
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  static async getSummary(): Promise<AnalyticsSummary | null> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

      const summary: AnalyticsSummary = {
        totalEvents: events.length,
        eventCounts: {},
        mostCreatedAnimals: {},
        mostUsedColors: {},
        toolUsage: { fill: 0, brush: 0 },
        screenViews: {},
        lastSevenDaysEvents: 0,
        conversionFunnel: {
          homeViews: 0,
          createViews: 0,
          coloringViews: 0,
          saveCompleted: 0,
        },
      };

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Analyze events
      events.forEach(event => {
        // Count all events
        summary.eventCounts[event.eventName] =
          (summary.eventCounts[event.eventName] || 0) + 1;

        // Count recent events
        if (event.timestamp > sevenDaysAgo) {
          summary.lastSevenDaysEvents++;
        }

        // Track screen views
        if (event.eventName === 'screen_view' && event.data?.screen) {
          summary.screenViews[event.data.screen] =
            (summary.screenViews[event.data.screen] || 0) + 1;

          // Conversion funnel
          if (event.data.screen === 'HomeScreen') summary.conversionFunnel.homeViews++;
          if (event.data.screen === 'CreateScreen') summary.conversionFunnel.createViews++;
          if (event.data.screen === 'ColoringScreen') summary.conversionFunnel.coloringViews++;
        }

        // Track animal creations
        if (event.eventName === 'hybrid_created' && event.data?.hybridKey) {
          summary.mostCreatedAnimals[event.data.hybridKey] =
            (summary.mostCreatedAnimals[event.data.hybridKey] || 0) + 1;
        }

        // Track saves
        if (event.eventName === 'animal_saved') {
          summary.conversionFunnel.saveCompleted++;
        }

        // Track tool usage
        if (event.eventName === 'tool_used' && event.data?.tool) {
          if (event.data.tool === 'fill') summary.toolUsage.fill++;
          if (event.data.tool === 'brush') summary.toolUsage.brush++;
        }

        // Track color usage
        if (event.eventName === 'color_selected' && event.data?.color) {
          summary.mostUsedColors[event.data.color] =
            (summary.mostUsedColors[event.data.color] || 0) + 1;
        }
      });

      return summary;
    } catch (error) {
      console.error('[LocalAnalytics] Failed to get summary:', error);
      return null;
    }
  }

  /**
   * Get raw events (for debugging)
   */
  static async getRawEvents(): Promise<AnalyticsEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return eventsJson ? JSON.parse(eventsJson) : [];
    } catch (error) {
      console.error('[LocalAnalytics] Failed to get raw events:', error);
      return [];
    }
  }

  /**
   * Clear all analytics data
   */
  static async clearData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[LocalAnalytics] Failed to clear data:', error);
    }
  }

  /**
   * Export analytics data as JSON string (for debugging)
   */
  static async exportData(): Promise<string> {
    try {
      const summary = await this.getSummary();
      const events = await this.getRawEvents();
      return JSON.stringify({ summary, events }, null, 2);
    } catch (error) {
      console.error('[LocalAnalytics] Failed to export data:', error);
      return '{}';
    }
  }
}

export default LocalAnalytics;
