/* OmniFit catalogs. Brand colors live in CSS — do not introduce extra accents here. */

const WORKOUTS = [
  {
    id: "full-body",
    name: "Full Body Strength",
    minutes: 32,
    level: "Intermediate",
    focus: "Strength",
    kcal: 280,
    blurb: "Compound lifts you can do at home. Dumbbells optional.",
    exercises: [
      { name: "Bodyweight Squats", kind: "reps", sets: 3, reps: 12, rest: 30, cue: "Feet shoulder-width. Sit back, chest tall." },
      { name: "Push-ups", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Elbows about 45°. Full range, no sag." },
      { name: "Glute Bridge", kind: "reps", sets: 3, reps: 15, rest: 30, cue: "Drive through heels. Squeeze 1s at the top." },
      { name: "Bent-over Row", kind: "reps", sets: 3, reps: 12, rest: 30, cue: "Hinge at the hips. Pull to the ribs." },
      { name: "Reverse Lunges", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "10 each leg. Knee tracks over toes." },
      { name: "Plank", kind: "time", sets: 3, seconds: 40, rest: 20, cue: "Ribs in, glutes on, neck long." },
      { name: "Dead Bug", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "8 each side. Low back stays glued down." },
      { name: "Cool-down Stretch", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Breathe. Open hips and chest." }
    ]
  },
  {
    id: "hiit-20",
    name: "20-min HIIT",
    minutes: 20,
    level: "Advanced",
    focus: "Cardio",
    kcal: 240,
    blurb: "Hard intervals, short rests. No equipment.",
    exercises: [
      { name: "Jumping Jacks", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Stay light on the feet." },
      { name: "High Knees", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Drive knees up. Arms pump." },
      { name: "Squat Jumps", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Land soft. Sit into the squat." },
      { name: "Mountain Climbers", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Hips level. Quick, quiet feet." },
      { name: "Burpees", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Chest to the floor if you can." },
      { name: "Skater Hops", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Push side to side. Stick the landing." },
      { name: "Push-up to Down Dog", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Smooth transition. Breathe out on the push." },
      { name: "Sprint in Place", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Last push. Fast arms." },
      { name: "Walk it Out", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Shake the legs. Bring the heart rate down." }
    ]
  },
  {
    id: "core-mobility",
    name: "Core & Mobility",
    minutes: 18,
    level: "Beginner",
    focus: "Core",
    kcal: 120,
    blurb: "Midsection strength plus hips and spine." ,
    exercises: [
      { name: "Cat-Cow", kind: "time", sets: 1, seconds: 45, rest: 10, cue: "Move with the breath." },
      { name: "Bird Dog", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "8 each side. Reach long, don't rush." },
      { name: "Side Plank", kind: "time", sets: 2, seconds: 25, rest: 15, cue: "One set each side. Hips stacked." },
      { name: "Glute Bridge Hold", kind: "time", sets: 2, seconds: 30, rest: 20, cue: "Ribs down. Squeeze without flaring." },
      { name: "World's Greatest Stretch", kind: "reps", sets: 2, reps: 6, rest: 15, cue: "6 each side. Slow and long." },
      { name: "Dead Bug", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "Exhale as the leg extends." },
      { name: "Child's Pose", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Hips to heels. Soften the jaw." }
    ]
  },
  {
    id: "upper-push",
    name: "Upper Body Push",
    minutes: 28,
    level: "Intermediate",
    focus: "Strength",
    kcal: 220,
    blurb: "Chest, shoulders, triceps. Floor or bench.",
    exercises: [
      { name: "Arm Circles", kind: "time", sets: 1, seconds: 40, rest: 10, cue: "Small then big. Both directions." },
      { name: "Push-ups", kind: "reps", sets: 4, reps: 8, rest: 40, cue: "Quality over speed. Knee option is fine." },
      { name: "Pike Push-ups", kind: "reps", sets: 3, reps: 8, rest: 40, cue: "Hips high. Head through the window." },
      { name: "Tricep Dips", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Shoulders down. Elbows back." },
      { name: "Plank Shoulder Taps", kind: "reps", sets: 3, reps: 12, rest: 20, cue: "12 each side. Hips quiet." },
      { name: "Superman Hold", kind: "time", sets: 3, seconds: 25, rest: 20, cue: "Thumbs up. Neck stays long." },
      { name: "Chest Opener Stretch", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Hands clasped or on a wall." }
    ]
  },
  {
    id: "lower-power",
    name: "Lower Body Power",
    minutes: 30,
    level: "Intermediate",
    focus: "Strength",
    kcal: 260,
    blurb: "Legs and glutes with a little bounce.",
    exercises: [
      { name: "Bodyweight Good Mornings", kind: "reps", sets: 2, reps: 12, rest: 20, cue: "Soft knees. Hinge, don't round." },
      { name: "Squats", kind: "reps", sets: 4, reps: 12, rest: 40, cue: "Depth you can own. Drive up tall." },
      { name: "Walking Lunges", kind: "reps", sets: 3, reps: 10, rest: 40, cue: "10 each leg. Long stride." },
      { name: "Glute Bridge March", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Hips stay level as you march." },
      { name: "Calf Raises", kind: "reps", sets: 3, reps: 15, rest: 20, cue: "Pause at the top. Slow down." },
      { name: "Wall Sit", kind: "time", sets: 2, seconds: 40, rest: 30, cue: "Knees over ankles. Back flat." },
      { name: "Forward Fold", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Hang heavy. Bend the knees if you need." }
    ]
  },
  {
    id: "recovery-flow",
    name: "Recovery Flow",
    minutes: 16,
    level: "Beginner",
    focus: "Recovery",
    kcal: 70,
    blurb: "Easy movement for off days and tight hips.",
    exercises: [
      { name: "Easy March", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Nasal breath. Shake the day off." },
      { name: "Hip Circles", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Slow. Both directions." },
      { name: "World's Greatest Stretch", kind: "reps", sets: 2, reps: 5, rest: 10, cue: "5 each side." },
      { name: "Figure-4 Stretch", kind: "time", sets: 2, seconds: 30, rest: 10, cue: "One set each side." },
      { name: "Thoracic Opener", kind: "time", sets: 2, seconds: 30, rest: 10, cue: "Open the chest without flaring ribs." },
      { name: "Legs Up the Wall", kind: "time", sets: 1, seconds: 90, rest: 0, cue: "Or lie flat. Eyes soft." }
    ]
  },
  {
    id: "foundations",
    name: "Foundations",
    minutes: 18,
    level: "Beginner",
    focus: "Strength",
    kcal: 130,
    blurb: "Slow strength basics. Learn the shapes.",
    exercises: [
      { name: "Sit to Stand", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Use a chair if you want. Stand tall." },
      { name: "Wall Push-ups", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Hands on the wall. Body in one line." },
      { name: "Hip Hinge Practice", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "Soft knees. Push the hips back." },
      { name: "Glute Bridge", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "Squeeze at the top. Slow down." },
      { name: "Standing March", kind: "time", sets: 2, seconds: 30, rest: 15, cue: "Hold a wall if you need." },
      { name: "Easy Stretch", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Breathe. Unclench the jaw." }
    ]
  },
  {
    id: "easy-upper",
    name: "Easy Upper Body",
    minutes: 16,
    level: "Beginner",
    focus: "Strength",
    kcal: 110,
    blurb: "Arms and shoulders without the grind.",
    exercises: [
      { name: "Arm Circles", kind: "time", sets: 1, seconds: 30, rest: 10, cue: "Small circles. Both ways." },
      { name: "Incline Push-ups", kind: "reps", sets: 3, reps: 8, rest: 30, cue: "Hands on a counter or bench." },
      { name: "Band-free Rows", kind: "reps", sets: 3, reps: 10, rest: 30, cue: "Hinge. Squeeze the shoulder blades." },
      { name: "Shoulder Taps on Knees", kind: "reps", sets: 2, reps: 8, rest: 20, cue: "8 each side. Hips still." },
      { name: "Wall Angels", kind: "reps", sets: 2, reps: 8, rest: 15, cue: "Ribs down. Slow." },
      { name: "Chest Stretch", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Open without flaring." }
    ]
  },
  {
    id: "pull-day",
    name: "Pull Day",
    minutes: 26,
    level: "Intermediate",
    focus: "Strength",
    kcal: 210,
    blurb: "Back, biceps, and rear shoulders.",
    exercises: [
      { name: "Scapular Squeezes", kind: "reps", sets: 2, reps: 12, rest: 15, cue: "Don't shrug. Slide the blades down." },
      { name: "Bent-over Row", kind: "reps", sets: 4, reps: 10, rest: 40, cue: "Hinge hard. Pull to the ribs." },
      { name: "Superman Pulls", kind: "reps", sets: 3, reps: 12, rest: 25, cue: "Thumbs back. Neck long." },
      { name: "Reverse Snow Angels", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "Keep the chest on the floor." },
      { name: "Prone Y-Raises", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "Pinkies up. Slow lower." },
      { name: "Dead Hang Shrug", kind: "reps", sets: 2, reps: 8, rest: 20, cue: "Or towel rows if no bar." },
      { name: "Child's Pose", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Reach long." }
    ]
  },
  {
    id: "strength-circuit",
    name: "Strength Circuit",
    minutes: 34,
    level: "Advanced",
    focus: "Strength",
    kcal: 320,
    blurb: "Little rest. Full-body load.",
    exercises: [
      { name: "Jump Squats", kind: "reps", sets: 4, reps: 10, rest: 20, cue: "Land quiet. Sit into it." },
      { name: "Push-up to Row", kind: "reps", sets: 4, reps: 8, rest: 25, cue: "8 total. Hips quiet on the row." },
      { name: "Reverse Lunge Jumps", kind: "reps", sets: 3, reps: 8, rest: 25, cue: "8 each leg. Stick the landing." },
      { name: "Pike Push-ups", kind: "reps", sets: 3, reps: 10, rest: 25, cue: "Head through. Strong lockout." },
      { name: "Hollow Rocks", kind: "time", sets: 3, seconds: 30, rest: 20, cue: "Low back glued. Small rocks." },
      { name: "Burpee", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "Chest down. Stand up tall." },
      { name: "Walk it Down", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Nasal breath." }
    ]
  },
  {
    id: "athletic-strength",
    name: "Athletic Strength",
    minutes: 30,
    level: "Advanced",
    focus: "Strength",
    kcal: 300,
    blurb: "Power, single-leg work, and control.",
    exercises: [
      { name: "A-skips", kind: "time", sets: 2, seconds: 30, rest: 15, cue: "Light and springy." },
      { name: "Split Squat", kind: "reps", sets: 3, reps: 8, rest: 30, cue: "8 each leg. Back knee drops." },
      { name: "Single-leg Bridge", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "8 each. Hips square." },
      { name: "Explosive Push-ups", kind: "reps", sets: 3, reps: 6, rest: 40, cue: "Hands leave if you can." },
      { name: "Broad Jump", kind: "reps", sets: 3, reps: 6, rest: 30, cue: "Stick it. Reset every rep." },
      { name: "Side Plank Reach", kind: "reps", sets: 2, reps: 8, rest: 20, cue: "8 each side." },
      { name: "World's Greatest Stretch", kind: "reps", sets: 2, reps: 5, rest: 0, cue: "Slow." }
    ]
  },
  {
    id: "easy-cardio",
    name: "Easy Cardio",
    minutes: 16,
    level: "Beginner",
    focus: "Cardio",
    kcal: 110,
    blurb: "Keep moving. You can talk the whole time.",
    exercises: [
      { name: "March in Place", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Soft feet. Swing the arms." },
      { name: "Step Touch", kind: "time", sets: 1, seconds: 45, rest: 15, cue: "Side to side. Relax the shoulders." },
      { name: "Easy Jacks", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Step it out if jumps feel like a lot." },
      { name: "Hamstring Curls", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Heel to glute. Alternate." },
      { name: "March with Reach", kind: "time", sets: 1, seconds: 45, rest: 15, cue: "Opposite arm, opposite knee." },
      { name: "Walk it Out", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Slow the breath." }
    ]
  },
  {
    id: "low-impact",
    name: "Low-Impact Cardio",
    minutes: 20,
    level: "Beginner",
    focus: "Cardio",
    kcal: 140,
    blurb: "Heart rate up. No jumping.",
    exercises: [
      { name: "Fast March", kind: "time", sets: 1, seconds: 50, rest: 15, cue: "Pump the arms." },
      { name: "Side Steps", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Stay low. Soft knees." },
      { name: "Standing Knee Drive", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Exhale on the drive." },
      { name: "Step-back Jack", kind: "time", sets: 1, seconds: 40, rest: 20, cue: "Step out instead of jump." },
      { name: "Punch Combo", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Rotate the ribs. Don't lock elbows." },
      { name: "Fast Feet", kind: "time", sets: 1, seconds: 30, rest: 20, cue: "Tiny steps. Quiet." },
      { name: "Easy Walk", kind: "time", sets: 1, seconds: 50, rest: 0, cue: "Shake the arms out." }
    ]
  },
  {
    id: "steady-burn",
    name: "Steady Burn",
    minutes: 24,
    level: "Intermediate",
    focus: "Cardio",
    kcal: 200,
    blurb: "Even pace. Stay in the work.",
    exercises: [
      { name: "Jog in Place", kind: "time", sets: 1, seconds: 50, rest: 15, cue: "Light landing." },
      { name: "Skater Steps", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Push off. Stick it." },
      { name: "Squat to Calf Raise", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Smooth. Don't bounce." },
      { name: "Mountain Climbers", kind: "time", sets: 1, seconds: 30, rest: 20, cue: "Hips level." },
      { name: "Fast March", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Recover without stopping." },
      { name: "Lateral Shuffle", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Stay low." },
      { name: "Jog Easy", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Downshift." }
    ]
  },
  {
    id: "cardio-mix",
    name: "Cardio Mix",
    minutes: 18,
    level: "Intermediate",
    focus: "Cardio",
    kcal: 180,
    blurb: "A little of everything. Keep the pace honest.",
    exercises: [
      { name: "Jumping Jacks", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Land soft." },
      { name: "Bodyweight Squats", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Sit back. Chest up." },
      { name: "High Knees", kind: "time", sets: 1, seconds: 30, rest: 20, cue: "Drive, don't flop." },
      { name: "Push-ups", kind: "time", sets: 1, seconds: 30, rest: 20, cue: "Knees okay. Keep moving." },
      { name: "Reverse Lunges", kind: "time", sets: 1, seconds: 40, rest: 15, cue: "Alternate. Long step." },
      { name: "Plank Jacks or Taps", kind: "time", sets: 1, seconds: 30, rest: 15, cue: "Hips quiet." },
      { name: "Walk", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Bring it down." }
    ]
  },
  {
    id: "tabata-blast",
    name: "Tabata Blast",
    minutes: 12,
    level: "Advanced",
    focus: "Cardio",
    kcal: 160,
    blurb: "20 on, 10 off. Don't pace this one.",
    exercises: [
      { name: "Squat Jumps", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "All out." },
      { name: "Mountain Climbers", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "Fast feet." },
      { name: "Burpees", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "Up and down." },
      { name: "High Knees", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "Arms pump." },
      { name: "Skater Hops", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "Cover ground." },
      { name: "Sprint in Place", kind: "time", sets: 2, seconds: 20, rest: 10, cue: "Last one. Empty the tank." },
      { name: "Walk it Out", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Hands on knees is fine." }
    ]
  },
  {
    id: "gentle-core",
    name: "Gentle Core",
    minutes: 14,
    level: "Beginner",
    focus: "Core",
    kcal: 80,
    blurb: "Learn to brace without strain.",
    exercises: [
      { name: "Diaphragmatic Breath", kind: "time", sets: 1, seconds: 45, rest: 0, cue: "Belly rises. Ribs stay quiet." },
      { name: "Dead Bug Hold", kind: "time", sets: 3, seconds: 20, rest: 15, cue: "Low back down. Small range." },
      { name: "Glute Bridge", kind: "reps", sets: 2, reps: 10, rest: 20, cue: "Ribs in." },
      { name: "Bird Dog", kind: "reps", sets: 2, reps: 6, rest: 15, cue: "6 each. Slow." },
      { name: "Side-lying Clamshell", kind: "reps", sets: 2, reps: 10, rest: 15, cue: "10 each. Don't roll back." },
      { name: "Knees Side to Side", kind: "reps", sets: 2, reps: 8, rest: 10, cue: "Shoulders stay heavy." },
      { name: "Happy Baby", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Soft face." }
    ]
  },
  {
    id: "core-stability",
    name: "Core Stability",
    minutes: 20,
    level: "Intermediate",
    focus: "Core",
    kcal: 140,
    blurb: "Anti-rotation and long holds.",
    exercises: [
      { name: "Dead Bug", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "8 each. Exhale out." },
      { name: "Plank", kind: "time", sets: 3, seconds: 40, rest: 20, cue: "Squeeze glutes. Don't dump the hips." },
      { name: "Side Plank", kind: "time", sets: 2, seconds: 30, rest: 15, cue: "One set each side." },
      { name: "Pallof Press Fake", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "Hands at chest. Resist the twist." },
      { name: "Glute Bridge March", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "Hips stay high." },
      { name: "Bird Dog Hold", kind: "time", sets: 2, seconds: 20, rest: 15, cue: "Each side. Long line." },
      { name: "Cobra or Sphinx", kind: "time", sets: 1, seconds: 30, rest: 0, cue: "Easy backbend." }
    ]
  },
  {
    id: "abs-obliques",
    name: "Abs & Obliques",
    minutes: 18,
    level: "Intermediate",
    focus: "Core",
    kcal: 150,
    blurb: "Front and sides. Quality over flopping.",
    exercises: [
      { name: "Crunch", kind: "reps", sets: 3, reps: 12, rest: 20, cue: "Ribs to hips. Don't yank the neck." },
      { name: "Heel Taps", kind: "reps", sets: 3, reps: 12, rest: 20, cue: "Low back stays down." },
      { name: "Bicycle", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "10 each. Slow the twist." },
      { name: "Side Plank Dip", kind: "reps", sets: 2, reps: 8, rest: 20, cue: "8 each. Hips stacked." },
      { name: "Reverse Crunch", kind: "reps", sets: 3, reps: 10, rest: 20, cue: "Curl the pelvis. Don't swing." },
      { name: "Dead Bug", kind: "reps", sets: 2, reps: 8, rest: 15, cue: "Reset." },
      { name: "Child's Pose", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Let the abs go." }
    ]
  },
  {
    id: "core-crusher",
    name: "Core Crusher",
    minutes: 22,
    level: "Advanced",
    focus: "Core",
    kcal: 180,
    blurb: "Longer sets. No sagging.",
    exercises: [
      { name: "Hollow Hold", kind: "time", sets: 3, seconds: 30, rest: 20, cue: "Low back glued. Arms long." },
      { name: "V-ups", kind: "reps", sets: 3, reps: 10, rest: 25, cue: "Reach to the toes. Control down." },
      { name: "Plank Shoulder Taps", kind: "reps", sets: 3, reps: 16, rest: 20, cue: "16 total. No wiggle." },
      { name: "Side Plank with Leg Lift", kind: "time", sets: 2, seconds: 25, rest: 15, cue: "Each side." },
      { name: "Toe Touches", kind: "reps", sets: 3, reps: 15, rest: 20, cue: "Shoulders off. Short range is fine." },
      { name: "Mountain Climbers Slow", kind: "time", sets: 2, seconds: 30, rest: 15, cue: "Drive the knee. Hips still." },
      { name: "Cobra", kind: "time", sets: 1, seconds: 30, rest: 0, cue: "Open the front." }
    ]
  },
  {
    id: "hollow-series",
    name: "Hollow Body Series",
    minutes: 16,
    level: "Advanced",
    focus: "Core",
    kcal: 140,
    blurb: "Gymnastics-style midline.",
    exercises: [
      { name: "Hollow Hold", kind: "time", sets: 3, seconds: 25, rest: 20, cue: "If you break, reset." },
      { name: "Hollow Rocks", kind: "time", sets: 3, seconds: 20, rest: 20, cue: "Shape doesn't change." },
      { name: "Tuck-to-Hollow", kind: "reps", sets: 3, reps: 8, rest: 20, cue: "Tuck, then lengthen." },
      { name: "Arch Hold", kind: "time", sets: 3, seconds: 20, rest: 20, cue: "Thumbs up. Opposite of hollow." },
      { name: "Dead Bug Strict", kind: "reps", sets: 3, reps: 6, rest: 15, cue: "6 each. No wiggle." },
      { name: "Happy Baby", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Release." }
    ]
  },
  {
    id: "morning-mobility",
    name: "Morning Mobility",
    minutes: 12,
    level: "Beginner",
    focus: "Recovery",
    kcal: 50,
    blurb: "Wake the joints. Five minutes of ease.",
    exercises: [
      { name: "Neck Rolls", kind: "time", sets: 1, seconds: 30, rest: 0, cue: "Slow. Skip any sharp spots." },
      { name: "Shoulder Rolls", kind: "time", sets: 1, seconds: 30, rest: 0, cue: "Both directions." },
      { name: "Cat-Cow", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Move with the breath." },
      { name: "Hip Circles", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Hands on hips." },
      { name: "World's Greatest Stretch", kind: "reps", sets: 1, reps: 4, rest: 0, cue: "4 each side." },
      { name: "Forward Fold", kind: "time", sets: 1, seconds: 30, rest: 0, cue: "Bend the knees." }
    ]
  },
  {
    id: "yoga-reset",
    name: "Yoga Reset",
    minutes: 20,
    level: "Intermediate",
    focus: "Recovery",
    kcal: 90,
    blurb: "Flow enough to unwind, not to sweat.",
    exercises: [
      { name: "Down Dog", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Pedal the heels." },
      { name: "Low Lunge", kind: "time", sets: 2, seconds: 30, rest: 5, cue: "Each side. Hips heavy." },
      { name: "Half Split", kind: "time", sets: 2, seconds: 25, rest: 5, cue: "Each side. Flex the front foot." },
      { name: "Thread the Needle", kind: "time", sets: 2, seconds: 25, rest: 5, cue: "Each side." },
      { name: "Seated Twist", kind: "time", sets: 2, seconds: 25, rest: 5, cue: "Tall spine. Easy turn." },
      { name: "Supine Twist", kind: "time", sets: 2, seconds: 30, rest: 5, cue: "Shoulders stay down." },
      { name: "Savasana", kind: "time", sets: 1, seconds: 60, rest: 0, cue: "Nothing to do." }
    ]
  },
  {
    id: "desk-reset",
    name: "Desk Reset",
    minutes: 14,
    level: "Intermediate",
    focus: "Recovery",
    kcal: 60,
    blurb: "Undoes sitting. Hips, chest, and spine.",
    exercises: [
      { name: "Chest Opener", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Hands on a wall or clasped." },
      { name: "Figure-4 Stretch", kind: "time", sets: 2, seconds: 30, rest: 10, cue: "Each side." },
      { name: "Couch Stretch Lite", kind: "time", sets: 2, seconds: 30, rest: 10, cue: "Each side. Squeeze the glute." },
      { name: "Thoracic Rotation", kind: "reps", sets: 2, reps: 6, rest: 10, cue:  "6 each. Follow the hand." },
      { name: "Hamstring Fold", kind: "time", sets: 1, seconds: 40, rest: 0, cue: "Soft knees." },
      { name: "Neck Side Bend", kind: "time", sets: 2, seconds: 20, rest: 5, cue: "Each side." }
    ]
  },
  {
    id: "deep-mobility",
    name: "Deep Mobility",
    minutes: 24,
    level: "Advanced",
    focus: "Recovery",
    kcal: 90,
    blurb: "Long holds. Get into the tight spots.",
    exercises: [
      { name: "Pigeon", kind: "time", sets: 2, seconds: 45, rest: 10, cue: "Each side. Square the hips." },
      { name: "Couch Stretch", kind: "time", sets: 2, seconds: 45, rest: 10, cue: "Each side. Tall torso." },
      { name: "Pike Fold", kind: "time", sets: 1, seconds: 45, rest: 10, cue: "Long spine first, then fold." },
      { name: "90/90 Hips", kind: "time", sets: 2, seconds: 40, rest: 10, cue: "Each side. Sit tall." },
      { name: "Shoulder CARs", kind: "reps", sets: 2, reps: 5, rest: 10, cue: "5 each. Biggest honest circle." },
      { name: "Jefferson Curl Lite", kind: "reps", sets: 2, reps: 6, rest: 15, cue: "Slow. Vertebra by vertebra." },
      { name: "Legs Up", kind: "time", sets: 1, seconds: 75, rest: 0, cue: "Done." }
    ]
  }
];

const WEEKLY_ROTATION = [
  "recovery-flow",
  "full-body",
  "hiit-20",
  "core-mobility",
  "upper-push",
  "lower-power",
  "recovery-flow"
];

const FOODS = [
  { id: "eggs", name: "Eggs (2 large)", cal: 144, p: 13, c: 1, f: 10, meal: "breakfast" },
  { id: "oats", name: "Oats (1 cup cooked)", cal: 166, p: 6, c: 28, f: 4, meal: "breakfast" },
  { id: "greek", name: "Greek yogurt (1 cup)", cal: 130, p: 20, c: 9, f: 0, meal: "breakfast" },
  { id: "banana", name: "Banana", cal: 105, p: 1, c: 27, f: 0, meal: "snack" },
  { id: "berries", name: "Mixed berries (1 cup)", cal: 70, p: 1, c: 17, f: 0, meal: "breakfast" },
  { id: "toast-av", name: "Avocado toast", cal: 280, p: 7, c: 28, f: 16, meal: "breakfast" },
  { id: "protein-shake", name: "Protein shake", cal: 160, p: 25, c: 8, f: 3, meal: "snack" },
  { id: "chicken", name: "Chicken breast (6 oz)", cal: 276, p: 52, c: 0, f: 6, meal: "lunch" },
  { id: "salmon", name: "Salmon (6 oz)", cal: 354, p: 39, c: 0, f: 22, meal: "dinner" },
  { id: "rice", name: "White rice (1 cup)", cal: 206, p: 4, c: 45, f: 0, meal: "lunch" },
  { id: "brown-rice", name: "Brown rice (1 cup)", cal: 216, p: 5, c: 45, f: 2, meal: "lunch" },
  { id: "quinoa", name: "Quinoa (1 cup)", cal: 222, p: 8, c: 39, f: 4, meal: "lunch" },
  { id: "sweet-pot", name: "Sweet potato", cal: 112, p: 2, c: 26, f: 0, meal: "dinner" },
  { id: "broccoli", name: "Broccoli (1 cup)", cal: 55, p: 4, c: 11, f: 0, meal: "dinner" },
  { id: "salad", name: "Mixed green salad", cal: 40, p: 2, c: 8, f: 0, meal: "lunch" },
  { id: "olive-oil", name: "Olive oil (1 tbsp)", cal: 119, p: 0, c: 0, f: 14, meal: "lunch" },
  { id: "turkey-sand", name: "Turkey sandwich", cal: 320, p: 24, c: 34, f: 8, meal: "lunch" },
  { id: "tuna", name: "Tuna (1 can, drained)", cal: 120, p: 26, c: 0, f: 1, meal: "lunch" },
  { id: "beef", name: "Lean beef (6 oz)", cal: 330, p: 48, c: 0, f: 14, meal: "dinner" },
  { id: "tofu", name: "Tofu (6 oz)", cal: 144, p: 16, c: 4, f: 8, meal: "dinner" },
  { id: "pasta", name: "Pasta (1 cup cooked)", cal: 220, p: 8, c: 43, f: 1, meal: "dinner" },
  { id: "apple", name: "Apple", cal: 95, p: 0, c: 25, f: 0, meal: "snack" },
  { id: "almonds", name: "Almonds (1 oz)", cal: 164, p: 6, c: 6, f: 14, meal: "snack" },
  { id: "pb", name: "Peanut butter (2 tbsp)", cal: 188, p: 8, c: 6, f: 16, meal: "snack" },
  { id: "cottage", name: "Cottage cheese (1 cup)", cal: 206, p: 28, c: 8, f: 5, meal: "snack" },
  { id: "whey", name: "Whey (1 scoop)", cal: 120, p: 24, c: 3, f: 1, meal: "snack" },
  { id: "latte", name: "Caffe latte (12 oz)", cal: 150, p: 8, c: 15, f: 6, meal: "breakfast" },
  { id: "oatmeal-pb", name: "Oatmeal + peanut butter", cal: 354, p: 14, c: 34, f: 20, meal: "breakfast" },
  { id: "stirfry", name: "Chicken stir-fry", cal: 420, p: 38, c: 32, f: 14, meal: "dinner" },
  { id: "burrito", name: "Bean burrito", cal: 380, p: 16, c: 56, f: 10, meal: "lunch" },
  { id: "pizza-slice", name: "Pizza slice", cal: 285, p: 12, c: 36, f: 10, meal: "dinner" },
  { id: "burger", name: "Turkey burger", cal: 390, p: 32, c: 28, f: 16, meal: "dinner" },
  { id: "smoothie", name: "Berry protein smoothie", cal: 240, p: 22, c: 28, f: 4, meal: "breakfast" },
  { id: "rice-bowl", name: "Chicken rice bowl", cal: 510, p: 42, c: 54, f: 12, meal: "lunch" },
  { id: "eggs-toast", name: "Eggs on toast", cal: 290, p: 18, c: 24, f: 12, meal: "breakfast" },
  { id: "hummus", name: "Hummus + carrots", cal: 180, p: 6, c: 20, f: 8, meal: "snack" },
  { id: "cheese", name: "Cheddar (1 oz)", cal: 113, p: 7, c: 1, f: 9, meal: "snack" },
  { id: "milk", name: "Milk (1 cup)", cal: 122, p: 8, c: 12, f: 5, meal: "breakfast" },
  { id: "orange", name: "Orange", cal: 62, p: 1, c: 15, f: 0, meal: "snack" },
  { id: "steak", name: "Sirloin (6 oz)", cal: 348, p: 50, c: 0, f: 16, meal: "dinner" }
];


const RESTAURANT_FOODS = [
  // McDonald's
  { id: "mcd-big-mac", name: "McDonald's Big Mac", cal: 590, p: 25, c: 46, f: 34 },
  { id: "mcd-qp-cheese", name: "McDonald's Quarter Pounder with Cheese", cal: 520, p: 30, c: 42, f: 26 },
  { id: "mcd-mcchicken", name: "McDonald's McChicken", cal: 400, p: 14, c: 40, f: 21 },
  { id: "mcd-nuggets-10", name: "McDonald's Chicken McNuggets (10 piece)", cal: 410, p: 24, c: 26, f: 24 },
  { id: "mcd-nuggets-6", name: "McDonald's Chicken McNuggets (6 piece)", cal: 250, p: 14, c: 15, f: 15 },
  { id: "mcd-fries-med", name: "McDonald's Medium Fries", cal: 320, p: 5, c: 43, f: 15 },
  { id: "mcd-fries-large", name: "McDonald's Large Fries", cal: 480, p: 7, c: 64, f: 23 },
  { id: "mcd-egg-mcmuffin", name: "McDonald's Egg McMuffin", cal: 310, p: 17, c: 30, f: 13 },
  { id: "mcd-filet", name: "McDonald's Filet-O-Fish", cal: 380, p: 16, c: 39, f: 18 },
  { id: "mcd-hashbrown", name: "McDonald's Hash Browns", cal: 140, p: 1, c: 18, f: 8 },
  { id: "mcd-sausage-biscuit", name: "McDonald's Sausage Biscuit", cal: 460, p: 12, c: 37, f: 30 },
  { id: "mcd-double-cheeseburger", name: "McDonald's Double Cheeseburger", cal: 450, p: 25, c: 34, f: 24 },
  { id: "mcd-mcdouble", name: "McDonald's McDouble", cal: 400, p: 22, c: 33, f: 20 },
  { id: "mcd-apple-pie", name: "McDonald's Baked Apple Pie", cal: 230, p: 2, c: 33, f: 11 },

  // Chipotle
  { id: "chip-burrito-chicken", name: "Chipotle Chicken Burrito", cal: 1030, p: 54, c: 101, f: 44 },
  { id: "chip-bowl-chicken", name: "Chipotle Chicken Bowl", cal: 630, p: 46, c: 56, f: 24 },
  { id: "chip-bowl-steak", name: "Chipotle Steak Bowl", cal: 620, p: 48, c: 53, f: 24 },
  { id: "chip-sofritas-bowl", name: "Chipotle Sofritas Bowl", cal: 580, p: 26, c: 67, f: 24 },
  { id: "chip-chips-guac", name: "Chipotle Chips and Guacamole", cal: 770, p: 10, c: 71, f: 52 },
  { id: "chip-taco-chicken", name: "Chipotle Chicken Soft Taco", cal: 210, p: 15, c: 18, f: 9 },

  // Taco Bell
  { id: "tb-crunchy-taco", name: "Taco Bell Crunchy Taco", cal: 170, p: 8, c: 13, f: 10 },
  { id: "tb-soft-taco", name: "Taco Bell Soft Taco", cal: 180, p: 9, c: 18, f: 8 },
  { id: "tb-bean-burrito", name: "Taco Bell Bean Burrito", cal: 380, p: 13, c: 55, f: 11 },
  { id: "tb-chalupa-supreme", name: "Taco Bell Chalupa Supreme", cal: 350, p: 13, c: 30, f: 20 },
  { id: "tb-crunchwrap", name: "Taco Bell Crunchwrap Supreme", cal: 530, p: 16, c: 54, f: 28 },
  { id: "tb-quesadilla-chicken", name: "Taco Bell Chicken Quesadilla", cal: 520, p: 27, c: 38, f: 28 },
  { id: "tb-nacho-fries", name: "Taco Bell Nacho Fries", cal: 320, p: 4, c: 34, f: 19 },

  // Starbucks
  { id: "sbux-latte-grande", name: "Starbucks Caffe Latte Grande", cal: 190, p: 13, c: 18, f: 7 },
  { id: "sbux-americano-grande", name: "Starbucks Americano Grande", cal: 15, p: 1, c: 2, f: 0 },
  { id: "sbux-cold-brew-grande", name: "Starbucks Cold Brew Grande", cal: 5, p: 0, c: 0, f: 0 },
  { id: "sbux-pumpkin-loaf", name: "Starbucks Pumpkin Bread", cal: 410, p: 6, c: 61, f: 16 },
  { id: "sbux-bacon-gouda", name: "Starbucks Bacon Gouda Sandwich", cal: 360, p: 18, c: 34, f: 17 },
  { id: "sbux-egg-bites", name: "Starbucks Egg White Bites", cal: 170, p: 13, c: 11, f: 8 },
  { id: "sbux-frap-mocha", name: "Starbucks Mocha Frappuccino Grande", cal: 370, p: 5, c: 54, f: 15 },

  // Subway
  { id: "sub-turkey-6", name: "Subway Turkey Breast 6-inch", cal: 280, p: 18, c: 46, f: 3.5 },
  { id: "sub-italian-bmt-6", name: "Subway Italian B.M.T. 6-inch", cal: 410, p: 20, c: 44, f: 18 },
  { id: "sub-meatball-6", name: "Subway Meatball Marinara 6-inch", cal: 480, p: 21, c: 54, f: 20 },
  { id: "sub-tuna-6", name: "Subway Tuna 6-inch", cal: 480, p: 20, c: 44, f: 25 },
  { id: "sub-oven-chicken-6", name: "Subway Oven Roasted Chicken 6-inch", cal: 320, p: 23, c: 47, f: 5 },

  // Wendy's
  { id: "wen-dave-single", name: "Wendy's Dave's Single", cal: 590, p: 30, c: 39, f: 34 },
  { id: "wen-dave-double", name: "Wendy's Dave's Double", cal: 870, p: 51, c: 40, f: 54 },
  { id: "wen-spicy-chicken", name: "Wendy's Spicy Chicken Sandwich", cal: 510, p: 29, c: 43, f: 24 },
  { id: "wen-nuggets-10", name: "Wendy's Chicken Nuggets (10 piece)", cal: 420, p: 25, c: 21, f: 26 },
  { id: "wen-fries-med", name: "Wendy's Medium Fries", cal: 350, p: 5, c: 47, f: 16 },
  { id: "wen-chili", name: "Wendy's Chili Large", cal: 330, p: 25, c: 30, f: 12 },

  // Chick-fil-A
  { id: "cfa-sandwich", name: "Chick-fil-A Chicken Sandwich", cal: 440, p: 29, c: 40, f: 18 },
  { id: "cfa-spicy", name: "Chick-fil-A Spicy Chicken Sandwich", cal: 460, p: 29, c: 41, f: 20 },
  { id: "cfa-nuggets-8", name: "Chick-fil-A Nuggets (8 count)", cal: 250, p: 27, c: 11, f: 11 },
  { id: "cfa-nuggets-12", name: "Chick-fil-A Nuggets (12 count)", cal: 380, p: 40, c: 16, f: 16 },
  { id: "cfa-waffle-fries-med", name: "Chick-fil-A Medium Waffle Fries", cal: 420, p: 5, c: 45, f: 24 },
  { id: "cfa-egg-white-grill", name: "Chick-fil-A Egg White Grill", cal: 290, p: 26, c: 31, f: 7 },
  { id: "cfa-cobb", name: "Chick-fil-A Cobb Salad", cal: 510, p: 42, c: 26, f: 27 },

  // In-N-Out
  { id: "ino-double-double", name: "In-N-Out Double-Double", cal: 670, p: 37, c: 41, f: 41 },
  { id: "ino-cheeseburger", name: "In-N-Out Cheeseburger", cal: 480, p: 22, c: 39, f: 27 },
  { id: "ino-hamburger", name: "In-N-Out Hamburger", cal: 390, p: 16, c: 41, f: 19 },
  { id: "ino-fries", name: "In-N-Out Fries", cal: 370, p: 5, c: 54, f: 15 },
  { id: "ino-protein-style", name: "In-N-Out Double-Double Protein Style", cal: 520, p: 33, c: 11, f: 39 },

  // Burger King
  { id: "bk-whopper", name: "Burger King Whopper", cal: 670, p: 31, c: 51, f: 39 },
  { id: "bk-whopper-jr", name: "Burger King Whopper Jr", cal: 310, p: 14, c: 27, f: 17 },
  { id: "bk-chicken-fries", name: "Burger King Chicken Fries (8 piece)", cal: 280, p: 13, c: 20, f: 17 },
  { id: "bk-fries-med", name: "Burger King Medium Fries", cal: 370, p: 4, c: 47, f: 18 },
  { id: "bk-original-chicken", name: "Burger King Original Chicken Sandwich", cal: 680, p: 25, c: 55, f: 41 },

  // Pizza Hut / Domino's (per slice)
  { id: "ph-pepperoni-slice", name: "Pizza Hut Pepperoni Pan Pizza Slice", cal: 330, p: 13, c: 31, f: 17 },
  { id: "ph-cheese-slice", name: "Pizza Hut Cheese Pan Pizza Slice", cal: 300, p: 12, c: 31, f: 14 },
  { id: "dom-pepperoni-slice", name: "Domino's Pepperoni Pizza Slice (hand tossed)", cal: 300, p: 12, c: 34, f: 13 },
  { id: "dom-cheese-slice", name: "Domino's Cheese Pizza Slice (hand tossed)", cal: 280, p: 11, c: 35, f: 11 },
  { id: "dom-philly", name: "Domino's Philly Cheese Steak Sandwich", cal: 720, p: 37, c: 57, f: 37 },

  // Panera
  { id: "pan-broccoli-cheddar", name: "Panera Broccoli Cheddar Soup Bowl", cal: 360, p: 13, c: 30, f: 21 },
  { id: "pan-chipotle-chicken", name: "Panera Chipotle Chicken Avocado Melt", cal: 750, p: 43, c: 64, f: 36 },
  { id: "pan-fuji-apple", name: "Panera Fuji Apple Salad with Chicken", cal: 560, p: 32, c: 45, f: 29 },
  { id: "pan-bagel-cc", name: "Panera Bagel with Cream Cheese", cal: 400, p: 12, c: 61, f: 12 },
  { id: "pan-mac", name: "Panera Mac and Cheese Bowl", cal: 970, p: 35, c: 86, f: 54 },
// Extra common restaurant items (1.0.91)
  { id: "chip-burrito-steak", name: "Chipotle Steak Burrito", cal: 1020, p: 56, c: 98, f: 43 },
  { id: "chip-burrito-carnitas", name: "Chipotle Carnitas Burrito", cal: 1070, p: 52, c: 101, f: 48 },
  { id: "chip-burrito-bowl", name: "Chipotle Burrito Bowl (chicken)", cal: 630, p: 46, c: 56, f: 24 },
  { id: "chip-veggie-bowl", name: "Chipotle Veggie Bowl", cal: 530, p: 18, c: 72, f: 20 },
  { id: "chip-quesadilla-chicken", name: "Chipotle Chicken Quesadilla", cal: 880, p: 50, c: 55, f: 49 },
  { id: "sbux-latte-venti", name: "Starbucks Caffe Latte Venti", cal: 250, p: 16, c: 24, f: 9 },
  { id: "sbux-capp-grande", name: "Starbucks Cappuccino Grande", cal: 140, p: 9, c: 14, f: 5 },
  { id: "sbux-caramel-macchiato-grande", name: "Starbucks Caramel Macchiato Grande", cal: 250, p: 10, c: 35, f: 7 },
  { id: "sbux-turkey-bacon", name: "Starbucks Turkey Bacon Sandwich", cal: 230, p: 17, c: 28, f: 5 },
  { id: "sbux-impossible", name: "Starbucks Impossible Breakfast Sandwich", cal: 420, p: 21, c: 40, f: 20 },
  { id: "tb-beefy-5", name: "Taco Bell Beefy 5-Layer Burrito", cal: 500, p: 19, c: 53, f: 23 },
  { id: "tb-doritos-loco", name: "Taco Bell Doritos Locos Taco", cal: 170, p: 8, c: 13, f: 10 },
  { id: "tb-power-bowl", name: "Taco Bell Cantina Chicken Bowl", cal: 470, p: 26, c: 51, f: 18 },
  { id: "sub-club-6", name: "Subway Club 6-inch", cal: 310, p: 23, c: 46, f: 4.5 },
  { id: "sub-spicy-italian-6", name: "Subway Spicy Italian 6-inch", cal: 480, p: 20, c: 44, f: 25 },
  { id: "pan-broccoli-cheddar-cup", name: "Panera Broccoli Cheddar Soup Cup", cal: 230, p: 8, c: 18, f: 14 },
  { id: "pan-chicken-noodle-cup", name: "Panera Homestyle Chicken Noodle Soup Cup", cal: 120, p: 9, c: 15, f: 2.5 },
  { id: "pan-turkey-sandwich", name: "Panera Turkey Sandwich", cal: 500, p: 32, c: 52, f: 17 },
  { id: "mcd-spicy-crispy", name: "McDonald's Spicy Crispy Chicken Sandwich", cal: 530, p: 27, c: 48, f: 26 },
  { id: "mcd-sausage-mcmuffin", name: "McDonald's Sausage McMuffin", cal: 400, p: 14, c: 29, f: 25 },
  { id: "cfa-grilled-sandwich", name: "Chick-fil-A Grilled Chicken Sandwich", cal: 390, p: 37, c: 44, f: 6 },
  { id: "cfa-nuggets-8-grilled", name: "Chick-fil-A Grilled Nuggets (8 count)", cal: 130, p: 25, c: 1, f: 3 },
  { id: "wen-baconator", name: "Wendy's Baconator", cal: 950, p: 57, c: 41, f: 63 },
  { id: "bk-impossible", name: "Burger King Impossible Whopper", cal: 630, p: 25, c: 58, f: 34 },
  { id: "dunk-bacon-egg-cheese", name: "Dunkin Bacon Egg and Cheese Sandwich", cal: 470, p: 19, c: 41, f: 26 },
  { id: "dunk-medium-latte", name: "Dunkin Medium Latte", cal: 150, p: 9, c: 16, f: 5 },
];


const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABEL = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks"
};
