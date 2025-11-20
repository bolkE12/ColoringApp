# Analytics Implementation Guide for Coloring Creatures

## ⚠️ Important Privacy Considerations

**Your app is currently marketed as:**
- Privacy-focused with NO data collection
- COPPA-compliant for children aged 4+
- No analytics platforms
- No third-party services

**If you add analytics, you MUST:**
1. Update the Privacy Policy
2. Update App Store description
3. Ensure COPPA compliance
4. Be transparent with users
5. Potentially add parental consent

---

## Option 1: Privacy-First Analytics (RECOMMENDED)

### Local Analytics Only
Track events locally on the device without sending data to external servers.

**Pros:**
- No privacy policy changes needed
- COPPA compliant
- No external dependencies
- No data collection

**Cons:**
- Can't see aggregate data across users
- Limited to device-specific insights
- No real-time monitoring

**Implementation:**
Use AsyncStorage to track events locally:

```typescript
// src/utils/localAnalytics.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  eventName: string;
  timestamp: number;
  data?: Record<string, any>;
}

class LocalAnalytics {
  private static STORAGE_KEY = '@local_analytics_events';

  // Track an event
  static async trackEvent(eventName: string, data?: Record<string, any>) {
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

      // Keep only last 1000 events to avoid storage issues
      if (events.length > 1000) {
        events.shift();
      }

      // Save back
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Get analytics summary
  static async getSummary() {
    try {
      const eventsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

      // Analyze events
      const summary = {
        totalEvents: events.length,
        eventCounts: {} as Record<string, number>,
        mostCreatedAnimals: {} as Record<string, number>,
        lastSevenDays: events.filter(
          e => e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length,
      };

      // Count events
      events.forEach(event => {
        summary.eventCounts[event.eventName] =
          (summary.eventCounts[event.eventName] || 0) + 1;

        // Track animal creation
        if (event.eventName === 'animal_created' && event.data?.animalKey) {
          summary.mostCreatedAnimals[event.data.animalKey] =
            (summary.mostCreatedAnimals[event.data.animalKey] || 0) + 1;
        }
      });

      return summary;
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }

  // Clear all analytics data
  static async clearData() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }
}

export default LocalAnalytics;
```

**Usage:**
```typescript
// In your components
import LocalAnalytics from '../utils/localAnalytics';

// Track when user creates an animal
LocalAnalytics.trackEvent('animal_created', {
  animalKey: 'bear_giraffe',
  screen: 'CreateScreen'
});

// Track when user saves
LocalAnalytics.trackEvent('animal_saved', {
  animalKey: 'bear_giraffe'
});

// Track screen views
LocalAnalytics.trackEvent('screen_view', {
  screen: 'HomeScreen'
});

// Track when user exits
LocalAnalytics.trackEvent('app_backgrounded');
```

---

## Option 2: Privacy-Respecting Third-Party Analytics

If you need aggregate data across users, use privacy-respecting services:

### A. TelemetryDeck (RECOMMENDED for Kids Apps)
- **GDPR & COPPA compliant**
- No personal data collection
- Anonymous by design
- EU-hosted

```bash
npm install @telemetrydeck/react-native
```

```typescript
// App.tsx
import { TelemetryDeck } from '@telemetrydeck/react-native';

TelemetryDeck.initialize({
  appID: 'YOUR_APP_ID',
  clientUser: 'anonymous', // No user tracking
});

// Track events
TelemetryDeck.signal('animal_created', {
  animalType: 'bear_giraffe'
});
```

**Cost:** Free for < 100k events/month, then ~$10/month

### B. PostHog (Self-Hosted Option)
- Open source
- Can self-host (full control)
- Anonymous by default

```bash
npm install posthog-react-native
```

### C. Mixpanel (with Privacy Mode)
- Popular choice
- Has privacy-friendly settings
- Can disable IP tracking

**⚠️ Privacy Policy Update Required:**
```
We use privacy-respecting analytics to understand how the app is used and improve it.
We collect anonymous usage data only:
- Feature usage (e.g., which animals are created)
- App crashes and errors
- General app performance

We do NOT collect:
- Personal information
- Location data
- Child-specific information
```

---

## Option 3: Standard Analytics (NOT RECOMMENDED for Kids Apps)

### Google Analytics for Firebase
❌ **Not recommended** because:
- Collects extensive data
- Requires detailed privacy disclosures
- COPPA compliance is complex
- May require parental consent

### Amplitude, Segment, etc.
❌ **Not recommended** for same reasons as above

---

## Recommended Events to Track

### User Journey Events
```typescript
// App lifecycle
'app_opened'
'app_backgrounded'
'app_foregrounded'

// Screen navigation
'screen_view' { screen: 'HomeScreen' | 'CreateScreen' | 'ColoringScreen' | 'PenScreen' }

// Feature usage
'animal_selected' { animal: 'bear' }
'hybrid_created' { hybridKey: 'bear_giraffe' }
'coloring_started' { hybridKey: 'bear_giraffe' }
'tool_used' { tool: 'fill' | 'brush' }
'color_selected' { color: '#FF6B6B' }
'animal_saved' { hybridKey: 'bear_giraffe' }
'animal_deleted' { hybridKey: 'bear_giraffe' }

// Engagement
'undo_used'
'clear_used'
'name_cycled'
'name_spoken'

// Music
'music_toggled' { state: 'on' | 'off' }

// IAP (when implemented)
'unlock_viewed'
'unlock_purchased'
'purchase_failed'

// Exit points
'back_pressed' { fromScreen: 'ColoringScreen' }
'app_closed' { lastScreen: 'HomeScreen' }
```

### Drop-off Analysis
Track screen flow:
```typescript
const screenFlow = [
  'HomeScreen',
  'CreateScreen', // Did they make it here?
  'ColoringScreen', // Did they make it here?
  'save_completed' // Did they save?
];
```

---

## Implementation Steps

### If Using Local Analytics (Option 1):

1. **Create the utility file**
   - Copy the `LocalAnalytics` class above
   - Save to `src/utils/localAnalytics.ts`

2. **Add tracking to screens**
   ```typescript
   // screens/HomeScreen.tsx
   useEffect(() => {
     LocalAnalytics.trackEvent('screen_view', { screen: 'HomeScreen' });
   }, []);

   // When animal selected
   const handleAnimalPress = (animal: string) => {
     LocalAnalytics.trackEvent('animal_selected', { animal });
     // ... rest of code
   };
   ```

3. **Add tracking to ColoringScreen**
   ```typescript
   // When hybrid created
   LocalAnalytics.trackEvent('hybrid_created', {
     hybridKey,
     baseAnimals: [animal1, animal2]
   });

   // When tool used
   const handleToolChange = (tool: 'fill' | 'brush') => {
     LocalAnalytics.trackEvent('tool_used', { tool });
     setActiveTool(tool);
   };

   // When saved
   LocalAnalytics.trackEvent('animal_saved', {
     hybridKey,
     coloringTimeSeconds: Math.floor((Date.now() - startTime) / 1000)
   });
   ```

4. **Add debug screen (dev only)**
   ```typescript
   // screens/DebugAnalyticsScreen.tsx
   const DebugAnalyticsScreen = () => {
     const [summary, setSummary] = useState(null);

     useEffect(() => {
       LocalAnalytics.getSummary().then(setSummary);
     }, []);

     return (
       <View>
         <Text>Total Events: {summary?.totalEvents}</Text>
         <Text>Most Created Animals:</Text>
         {Object.entries(summary?.mostCreatedAnimals || {}).map(([key, count]) => (
           <Text key={key}>{key}: {count}</Text>
         ))}
         <Button title="Clear Data" onPress={() => LocalAnalytics.clearData()} />
       </View>
     );
   };
   ```

5. **NO privacy policy changes needed!** ✅

---

### If Using TelemetryDeck (Option 2A):

1. **Sign up at telemetrydeck.com**
   - Create account
   - Get App ID

2. **Install package**
   ```bash
   npm install @telemetrydeck/react-native
   ```

3. **Initialize in App.tsx**
   ```typescript
   import { TelemetryDeck } from '@telemetrydeck/react-native';

   useEffect(() => {
     TelemetryDeck.initialize({
       appID: 'YOUR_APP_ID',
       clientUser: 'anonymous',
     });
   }, []);
   ```

4. **Track events**
   ```typescript
   TelemetryDeck.signal('animal_created', {
     animalKey: 'bear_giraffe'
   });
   ```

5. **Update Privacy Policy:**
   ```markdown
   ## Analytics

   We use TelemetryDeck, a privacy-first analytics service, to understand how the app is used:
   - All data is anonymous
   - No personal information is collected
   - No user tracking or profiling
   - COPPA and GDPR compliant
   - Data is aggregated only for improving the app

   Learn more: https://telemetrydeck.com/privacy
   ```

6. **Update App Store description:**
   Remove "No analytics" claim, add:
   - "Privacy-respecting anonymous analytics to improve the app"

---

## Key Metrics to Track

### Engagement Metrics
- Daily Active Users (DAU)
- Session Length
- Sessions per User
- Return Rate (Day 1, Day 7, Day 30)

### Feature Adoption
- % of users who create hybrids
- % of users who save animals
- % of users who visit Animal Pen
- Most popular animals
- Most popular hybrids
- Most used colors

### Drop-off Points
- HomeScreen → CreateScreen conversion
- CreateScreen → ColoringScreen conversion
- ColoringScreen → Save conversion
- % who complete first save

### Monetization (when IAP added)
- Unlock view rate
- Purchase conversion rate
- Time to purchase
- Repeat usage after purchase

---

## Compliance Checklist

### If Adding ANY Analytics:

- [ ] Review COPPA requirements
- [ ] Update Privacy Policy
- [ ] Update App Store privacy questions
- [ ] Consider adding "Ask App Not to Track" support (iOS 14.5+)
- [ ] Test data collection to ensure compliance
- [ ] Consider parental consent for under-13 users
- [ ] Document what data is collected and why
- [ ] Provide opt-out mechanism (if applicable)

### COPPA Requirements for Analytics:
- ✅ No personal information collection
- ✅ No behavioral advertising
- ✅ No persistent identifiers tied to users
- ✅ No location tracking
- ✅ Parental notice and consent (if collecting data)

---

## My Recommendation

**Start with Local Analytics (Option 1)**

Why:
1. **No privacy concerns** - everything stays on device
2. **No external dependencies** - works offline
3. **No ongoing costs** - completely free
4. **COPPA compliant** - no data collection
5. **Easy to implement** - just AsyncStorage
6. **Good enough** - you'll learn the key metrics you need

You can see:
- Which animals/hybrids are most popular (per device)
- Where users drop off (per device)
- Feature usage patterns (per device)

Later, if you need aggregate data:
- Add TelemetryDeck for privacy-first analytics
- Update privacy policy
- Keep local analytics too for debugging

---

## Example Implementation

Want me to:
1. Create the LocalAnalytics utility?
2. Add tracking to all screens?
3. Create a debug analytics viewer?
4. Update privacy policy (if going with external analytics)?

Let me know which option you prefer!
