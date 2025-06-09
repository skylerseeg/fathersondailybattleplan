import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Scale, ShieldCheck, Zap, TrendingUp, Users, FileText, X, Sun, Moon, Briefcase, Sparkles, Utensils, Heart, Dribbble, Gamepad2, Brain, Send, Hourglass, Coffee, CheckCircle, XCircle } from 'lucide-react';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

// --- Firebase Initialization (YOUR CUSTOM CONFIGURATION HERE) ---
// IMPORTANT: Replace the placeholder values below with YOUR actual Firebase project details
// from your Firebase Console -> Project settings -> Your apps -> Web app setup
const firebaseConfig = {
  apiKey: "AIzaSyC-eBwi6nOezBzsjxV3pNbI6Yb8CG-ZVOs",
  authDomain: "fathersonbattleplan.firebaseapp.com",
  databaseURL: "https://fathersonbattleplan-default-rtdb.firebaseio.com",
  projectId: "fathersonbattleplan",
  storageBucket: "fathersonbattleplan.firebasestorage.app",
  messagingSenderId: "1007439241526",
  appId: "1:1007439241526:web:348e407f5edcfadd875397",
  measurementId: "G-K2EPGGMN3Z"
};

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Helper Components ---

// A visually appealing card component, matching the provided style
const Card = ({ children, className = '' }) => (
  <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

// Icon wrapper for consistent styling, matching the provided style
const IconHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center mb-4">
    {Icon && <Icon className="w-6 h-6 mr-3 text-cyan-400" />}
    <h3 className="text-xl font-bold text-white">{title}</h3>
  </div>
);

// TimeBlockCard component to display each segment of the daily plan
const TimeBlockCard = ({ timeRange, decal, reason, icon: Icon, isActive, id, isAccomplished, onAccomplishToggle, blockProgress }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const reasonRef = useRef(null);

  // Handle click to toggle expansion
  const toggleReason = () => {
    setIsExpanded(!isExpanded);
  };

  // Adjust max-height for smooth transition when content changes dynamically
  useEffect(() => {
    if (reasonRef.current) {
      reasonRef.current.style.maxHeight = isExpanded ? `${reasonRef.current.scrollHeight}px` : '0px';
    }
  }, [isExpanded, reason]);

  return (
    <Card className={`relative flex flex-col transition-all duration-300 ${isActive ? 'border-cyan-500 bg-cyan-900/30' : ''}`}>
      {/* Active highlight indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500 rounded-l-xl animate-pulse"></div>
      )}

      {/* Time Range */}
      <div className={`text-sm font-semibold mb-2 ${isActive ? 'text-cyan-200' : 'text-gray-400'}`}>
        {timeRange}
      </div>

      {/* Decal / Motto */}
      <div className="flex items-center mb-3">
        {Icon && <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />}
        <h4 className={`text-lg font-bold ${isActive ? 'text-white' : 'text-gray-200'}`}>{decal}</h4>
      </div>

      {/* Progression Bar for the current block (only if active) */}
      {isActive && (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
          <div
            className="bg-cyan-600 h-2.5 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${blockProgress}%` }}
          ></div>
        </div>
      )}

      {/* Battle Block Accomplished? Question */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="text-gray-300 text-base font-medium">Battle Block Accomplished?</span>
        <div className="flex space-x-2">
          <button
            onClick={() => onAccomplishToggle(id, true)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isAccomplished ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-green-700'
            }`}
            aria-label="Mark battle block as accomplished"
          >
            <CheckCircle size={20} />
          </button>
          <button
            onClick={() => onAccomplishToggle(id, false)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              !isAccomplished && isAccomplished !== null ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-red-700'
            }`}
            aria-label="Mark battle block as not accomplished"
          >
            <XCircle size={20} />
          </button>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleReason}
        aria-expanded={isExpanded}
        aria-controls={`reason-${id}`}
        className={`mt-2 self-start text-sm font-semibold transition-colors duration-200 
                    ${isActive ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-400 hover:text-white'}`}
      >
        {isExpanded ? 'Hide Purpose' : 'Reveal Purpose'}
      </button>

      {/* Reason / Purpose (collapsible) */}
      <div
        ref={reasonRef}
        id={`reason-${id}`}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 mt-4' : 'opacity-0'}`}
        style={{ maxHeight: isExpanded ? `${reasonRef.current?.scrollHeight || 500}px` : '0px' }} // Use scrollHeight for accurate transition
      >
        <p className="text-sm text-gray-300">
          {reason}
        </p>
      </div>
    </Card>
  );
};

// --- Main Application Component ---
export default function App() {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentBlockId, setCurrentBlockId] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(0); // Daily progression bar percentage
  const [blockProgress, setBlockProgress] = useState(0); // Current block progression percentage

  // Firestore states for accomplishments
  const [dailyCompletedBlocks, setDailyCompletedBlocks] = useState(new Set());
  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [yearlyCount, setYearlyCount] = useState(0);

  // Define the Daily Battle Plan schedule data
  const schedule = [
    {
      id: 'block-1',
      timeRange: '7:00 am – 9:30 am',
      decal: '💥 “Own the Morning, Own the Market.”',
      reason: 'This block sets the tone for the day. It’s your war room where you send out proposals, record personalized Loom videos, and generate leads with intention. This is where deals start, partnerships form, and the revenue machine starts to hum. Here, your undivided attention means you build the future — no distractions, just pure execution.',
      icon: Briefcase,
      startTime: '07:00',
      endTime: '09:30',
    },
    {
      id: 'block-2',
      timeRange: '9:30 am – 11:30 am',
      decal: '👊 “Invest in the Bond, Invest in the Legacy.”',
      reason: 'This block is about giving your son the best of you — present, engaged, and fully invested. It’s where you build skills on and off the ice, but more importantly, it’s about modeling what focus, effort, and joy look like. This undivided time shows him he matters more than any business deal. It’s the foundation of trust and connection.',
      icon: Heart,
      startTime: '09:30',
      endTime: '11:30',
    },
    {
      id: 'block-3',
      timeRange: '11:30 am – 12:00 pm',
      decal: '🍽️ “Break Bread, Build Trust.”',
      reason: 'This is the daily table where you and Lyric reconnect, share wins, laugh, and breathe together. It’s the anchor between work and play — a reset that strengthens your bond. It’s not just about the meal; it’s about sharing the journey and showing him how a man balances family and purpose.',
      icon: Utensils,
      startTime: '11:30',
      endTime: '12:00',
    },
    {
      id: 'block-4',
      timeRange: '12:00 pm – 12:30 pm',
      decal: '🌿 “Breathe to Build.”',
      reason: 'This block is about reconnecting with your core. It’s a chance to ground yourself, refocus, and teach Lyric the value of presence. It’s also a mental reset—a pause between fatherhood and deep work—that helps you show up as your best self in every area of life.',
      icon: Sparkles,
      startTime: '12:00',
      endTime: '12:30',
    },
    {
      id: 'block-5',
      timeRange: '12:30 pm – 3:00 pm',
      decal: '🚀 “Fuel the Machine.”',
      reason: 'This is where the real momentum happens. You’re tackling your highest-leverage tasks: building pipelines, automations, and proposals that fuel the engine of your business. This block is about making real progress—turning ideas into impact—and setting yourself up to win.',
      icon: Zap,
      startTime: '12:30',
      endTime: '15:00',
    },
    {
      id: 'block-6',
      timeRange: '3:00 pm – 5:30 pm',
      decal: '🏓 “Play Hard, Love Harder.”',
      reason: 'This is where you bond through play—pushing each other, having fun, and staying active. It’s about building memories, teaching resilience, and showing him that balance matters. When you play together, you build trust that lasts a lifetime.',
      icon: Dribbble,
      startTime: '15:00',
      endTime: '17:30',
    },
    {
      id: 'block-7',
      timeRange: '5:30 pm – 8:00 pm',
      decal: '⚡ “Close the Day with Focus.”',
      reason: 'This is your second push—wrapping up leads, proposals, and tasks that drive tomorrow’s success. It’s about finishing strong so that when you step into family time later, your mind is clear and your heart is open.',
      icon: Briefcase,
      startTime: '17:30',
      endTime: '20:00',
    },
    {
      id: 'block-8',
      timeRange: '8:00 pm – 10:30 pm',
      decal: '❤️ “Present in the Moment.”',
      reason: 'This is your final, undistracted time with Lyric before bed. It’s where you listen, share stories, laugh, and let him know he matters more than any deal. These moments build the relationship that defines fatherhood.',
      icon: Users,
      startTime: '20:00',
      endTime: '22:30',
    },
    {
      id: 'block-9',
      timeRange: '10:30 pm – 12:00 am',
      decal: '🌙 “Optional Hustle.”',
      reason: 'This is bonus time—only if you’re still feeling that spark. It’s about using your quiet hours to get ahead, but only if your energy allows. If you’re spent, let it go. You’ve already put in the work that matters.',
      icon: Hourglass,
      startTime: '22:30',
      endTime: '24:00',
    },
  ];

  // --- Firebase Authentication Effect ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // For self-hosted apps, use Firebase's standard sign-in methods
        // Anonymous sign-in is simple to get started:
        await signInAnonymously(auth);
        // You can later add email/password, Google, etc.
      } catch (error) {
        console.error("Firebase Auth Error:", error);
      }
    };

    initFirebase();

    // Set up auth state change listener to get userId
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Fallback: If no authenticated user, use a random UUID.
        setUserId(crypto.randomUUID());
      }
      setIsAuthReady(true); // Mark auth as ready once userId is determined
    });

    return () => unsubscribeAuth(); // Cleanup auth listener on unmount
  }, []);

  // --- Firestore Data Listeners (Daily, Monthly, Yearly Accomplishments) ---
  useEffect(() => {
    if (!isAuthReady || !userId) return; // Wait until auth is ready and userId is set

    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Listen to Today's Accomplishments
    // The appId here will be the one from your firebaseConfig (e.g., your_project_id)
    const dailyDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/dailyAccomplishments`, todayIso);
    const unsubscribeDaily = onSnapshot(dailyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const completed = new Set(data.completedBlockIds || []);
        setDailyCompletedBlocks(completed);
        setDailyCount(completed.size);
      } else {
        // If no document for today, reset counts for today
        setDailyCompletedBlocks(new Set());
        setDailyCount(0);
      }
    }, (error) => console.error("Error listening to daily accomplishments:", error));

    // 2. Listen to Monthly & Yearly Accomplishments (Aggregate from all daily records)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed month

    // The collection path uses your projectId from firebaseConfig
    const allDailyRecordsQuery = query(collection(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/dailyAccomplishments`));

    const unsubscribeAggregate = onSnapshot(allDailyRecordsQuery, (snapshot) => {
      let totalMonth = 0;
      let totalYear = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure 'date' field exists and is a valid date string
        if (data.date) {
            const recordDate = new Date(data.date); // 'YYYY-MM-DD' string to Date object
            const completedCount = (data.completedBlockIds || []).length;

            if (recordDate.getFullYear() === currentYear) {
                totalYear += completedCount;
                if (recordDate.getMonth() === currentMonth) { // Compare 0-indexed months
                    totalMonth += completedCount;
                }
            }
        }
      });
      setMonthlyCount(totalMonth);
      setYearlyCount(totalYear);
    }, (error) => console.error("Error listening to aggregate accomplishments:", error));

    // Cleanup listeners on unmount
    return () => {
      unsubscribeDaily();
      unsubscribeAggregate();
    };
  }, [isAuthReady, userId, firebaseConfig.projectId]); // Added firebaseConfig.projectId to dependencies


  // --- Time Progression Logic ---
  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      // 1. Daily Progression
      const totalDayMinutes = 24 * 60; // Total minutes in a day
      setDailyProgress((currentTimeInMinutes / totalDayMinutes) * 100);

      // 2. Current Block Highlighting & Progression
      let activeBlockFound = false;
      let currentBlockStartTime = 0;
      let currentBlockEndTime = 0;
      let adjustedCurrentTime = currentTimeInMinutes; // Initialize here to ensure it's always defined

      for (const block of schedule) {
        const [startH, startM] = block.startTime.split(':').map(Number);
        const [endH, endM] = block.endTime.split(':').map(Number);

        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        // Handle blocks spanning midnight (e.g., 23:00 - 01:00)
        // If the end time is numerically less than the start time, it means it's on the next day
        if (endTimeInMinutes < startTimeInMinutes) {
          endTimeInMinutes += 24 * 60; // Adjust end time to be relative to the same 24-hour cycle
        }

        // Adjust current time for comparison if we're in the 'next day' part of an overnight block.
        // This is necessary if current time is small (e.g., 00:30) but conceptually falls into a block
        // that started the previous day (e.g., 23:00-01:00).
        // Check if current time is 'before' the block's start time and the block spans midnight.
        // Using `now.getDate()` vs `new Date(...)` comparison ensures we're not adding 24 hours
        // incorrectly if the block starts and ends on the same day.
        if (currentHours < startH && now.getDate() !== new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM).getDate() && endTimeInMinutes > 24 * 60) {
             adjustedCurrentTime = currentTimeInMinutes + 24 * 60;
        } else {
            adjustedCurrentTime = currentTimeInMinutes; // Default to normal current time
        }


        if (adjustedCurrentTime >= startTimeInMinutes && adjustedCurrentTime < endTimeInMinutes) {
          setCurrentBlockId(block.id);
          activeBlockFound = true;
          currentBlockStartTime = startTimeInMinutes;
          currentBlockEndTime = endTimeInMinutes;
          
          // Calculate and set block progress only if an active block is found
          const blockDuration = currentBlockEndTime - currentBlockStartTime;
          const elapsedInBlock = adjustedCurrentTime - currentBlockStartTime;
          setBlockProgress((elapsedInBlock / blockDuration) * 100);
          
          break; // Found the active block, exit loop
        }
      }

      if (!activeBlockFound) {
        setCurrentBlockId(null);
        setBlockProgress(0); // No block active, reset block progress
      }
    };

    updateProgress(); // Initial call
    const intervalId = setInterval(updateProgress, 1000); // Update every second for smooth progress bars
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [schedule]); // Re-run if schedule changes (though it's static here)


  // --- Handle Accomplish Toggle (Yes/No button logic) ---
  const handleAccomplishToggle = async (blockId, accomplished) => {
    if (!userId) {
      console.warn("User ID not available. Cannot save accomplishment.");
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // Use firebaseConfig.projectId for the appId part of the path
    const dailyDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/dailyAccomplishments`, todayIso);

    // Fetch current state to ensure atomicity for robust toggling
    let currentCompleted = new Set();
    try {
        const docSnap = await getDoc(dailyDocRef);
        if (docSnap.exists()) {
            currentCompleted = new Set(docSnap.data().completedBlockIds || []);
        }
    } catch (error) {
        console.error("Error fetching daily accomplishments for toggle:", error);
        // Proceed with an empty set if fetch fails to avoid breaking functionality
    }

    if (accomplished) {
      currentCompleted.add(blockId);
    } else {
      currentCompleted.delete(blockId);
    }

    try {
      // Use setDoc with merge: true to update the array or create the document if it doesn't exist
      await setDoc(dailyDocRef, {
        date: todayIso,
        completedBlockIds: Array.from(currentCompleted), // Convert Set to Array for Firestore
      }, { merge: true });
    } catch (error) {
      console.error("Error updating accomplishment:", error);
    }
  };


  return (
    // Main container matching the AI Policy Simulator's body style
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Father and Son Daily Battle Plan</h1>
          <p className="mt-2 text-lg text-gray-400">Win the day with focus and purpose.</p>
        </header>

        {/* Global Progress and Counters Section */}
        <Card className="mb-8 p-4">
          <h3 className="text-xl font-bold text-white mb-4">Daily Progression</h3>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${dailyProgress}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">Daily Battles Won</p>
              <p className="text-2xl font-bold text-white">{dailyCount}</p>
            </div>
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">Monthly Battles Won</p>
              <p className="text-2xl font-bold text-white">{monthlyCount}</p>
            </div>
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">Yearly Battles Won</p>
              <p className="text-2xl font-bold text-white">{yearlyCount}</p>
            </div>
          </div>
        </Card>

        {/* Time Blocks List */}
        <div className="space-y-6">
          {schedule.map((block) => (
            <TimeBlockCard
              key={block.id}
              id={block.id}
              timeRange={block.timeRange}
              decal={block.decal}
              reason={block.reason}
              icon={block.icon}
              isActive={currentBlockId === block.id}
              isAccomplished={dailyCompletedBlocks.has(block.id)} // Pass accomplishment status
              onAccomplishToggle={handleAccomplishToggle} // Pass toggle function
              blockProgress={blockProgress} // Pass current block's progress
            />
          ))}
        </div>

        {/* Footer Section */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Your User ID: {userId || 'Authenticating...'}</p>
          <p>© {new Date().getFullYear()} Skyler Seegmiller. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
