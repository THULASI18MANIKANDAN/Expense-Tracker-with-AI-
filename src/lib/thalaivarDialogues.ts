export interface ThalaivarDialogue {
  tamilInEnglish: string; // Tanglish
  meaningInEnglish: string;
  movieReference: string;
  emoji: string;
  vibe: string;
}

export interface SpendingRateTier {
  id: "chillarai" | "mass" | "heavy" | "danger";
  name: string;
  tagline: string;
  dialogues: ThalaivarDialogue[];
  emojis: string[];
  badgeColor: string;
  borderColor: string;
  glowColor: string;
}

export const THALAIVAR_TIERS: Record<string, SpendingRateTier> = {
  chillarai: {
    id: "chillarai",
    name: "Chillarai Matter 😎",
    tagline: "Pocket-Friendly & Cool Spending",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/40",
    glowColor: "rgba(16, 185, 129, 0.4)",
    emojis: ["🕶️", "☕", "😎", "🔥", "🤘", "✨"],
    dialogues: [
      {
        tamilInEnglish: "Kanna, idhu verum chillarai matter! Idhu epdi irukku?!",
        meaningInEnglish: "This is just pocket change, my boy! How is this style?!",
        movieReference: "16 Vayathinile / Baasha",
        emoji: "🕶️",
        vibe: "Super Chill"
      },
      {
        tamilInEnglish: "En vazhi... thani vazhi! Tea kadai ku poniyana, illa auto pudichiya? Mass panna!",
        meaningInEnglish: "My way is a unique way! Small spend, full style!",
        movieReference: "Padayappa",
        emoji: "☕",
        vibe: "Pure Style"
      },
      {
        tamilInEnglish: "Chinna amount dhaan kanna, aana Thalaivar style-la record aayiduchu! Magizhchi!",
        meaningInEnglish: "Small amount indeed, but recorded in true Thalaivar style! Great happiness!",
        movieReference: "Kabali",
        emoji: "🤘",
        vibe: "Magizhchi"
      },
      {
        tamilInEnglish: "Cool kanna! Idhu trailer dhaan... Savings account safe-ah dhaan irukku!",
        meaningInEnglish: "Stay cool! This is just a trailer... Savings account is safe and sound!",
        movieReference: "Sivaji The Boss",
        emoji: "😎",
        vibe: "Relaxed"
      },
      {
        tamilInEnglish: "Singam single-ah dhaan varum... Aana un spend bill konjam light-ah dhaan vandhurukku!",
        meaningInEnglish: "A lion always arrives alone... and this bill came nice and light!",
        movieReference: "Sivaji",
        emoji: "🦁",
        vibe: "Lion Heart"
      }
    ]
  },
  mass: {
    id: "mass",
    name: "Solid Mass Spend 🦁",
    tagline: "Standard Normal Flow • Balance Maintained",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    borderColor: "border-cyan-500/40",
    glowColor: "rgba(6, 182, 212, 0.4)",
    emojis: ["🦁", "⚡", "💥", "🕶️", "🍿", "🔥"],
    dialogues: [
      {
        tamilInEnglish: "Naan oru thadava sonna, nooru thadava sonna maadiri! Budget control la irukanum!",
        meaningInEnglish: "If I say it once, it's like a hundred times! Keep that budget in check!",
        movieReference: "Baasha",
        emoji: "⚡",
        vibe: "Strict Control"
      },
      {
        tamilInEnglish: "Naan eppo varuven, epdi varuven-nu yaarukkum theriyaadhu... Aana vara vendiya bill correct-ah vandhuduchu!",
        meaningInEnglish: "Nobody knows when or how I arrive... But the bill arrived right on time!",
        movieReference: "Muthu",
        emoji: "🦁",
        vibe: "Timely Mass"
      },
      {
        tamilInEnglish: "Kanna, kashta padama edhuvum kedaikaadhu! Proper spending, no tension!",
        meaningInEnglish: "Without working hard nothing comes! Balanced spend, zero stress!",
        movieReference: "Padayappa",
        emoji: "💥",
        vibe: "Wisdom"
      },
      {
        tamilInEnglish: "Andha aandavan solran... Arunkumar seiraan! Nalla enjoy pannu, aana track pannu!",
        meaningInEnglish: "The Almighty orders, we execute! Enjoy your expense, but keep track!",
        movieReference: "Annamalai",
        emoji: "🕶️",
        vibe: "Confident"
      },
      {
        tamilInEnglish: "Kabali da! Eppo paathaalum adhe mass... Decent expense, continue pannu!",
        meaningInEnglish: "It's Kabali! Everlasting mass... Decent expense, keep tracking!",
        movieReference: "Kabali",
        emoji: "🍿",
        vibe: "Heroic"
      }
    ]
  },
  heavy: {
    id: "heavy",
    name: "Heavyweight Attack 💥",
    tagline: "High Spend Detected • Wallet Under Stress",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.4)",
    emojis: ["😱", "💸", "🚨", "💥", "🕶️", "⚡"],
    dialogues: [
      {
        tamilInEnglish: "Kanna... Panni dhaan kootama varum, aana indha bill paatha singame shock aayidum!",
        meaningInEnglish: "Only pigs travel in herds, but looking at this hefty bill even the lion is stunned!",
        movieReference: "Sivaji",
        emoji: "😱",
        vibe: "Shock Attack"
      },
      {
        tamilInEnglish: "Aei... Enna paatha unakku epdi theriyudhu?! Wallet le irundhu panam rocket speed-la fly aagudhu!",
        meaningInEnglish: "Hey... How do I look to you?! Money is rocketing out of the wallet!",
        movieReference: "Padayappa",
        emoji: "💸",
        vibe: "Rocket Burn"
      },
      {
        tamilInEnglish: "Kadhai, thirai-kadhai, vasanam... Aana bill matum vera level horror climax!",
        meaningInEnglish: "Story, screenplay, dialogues... But this bill is a whole horror climax!",
        movieReference: "Chandramukhi",
        emoji: "💥",
        vibe: "Horror Twist"
      },
      {
        tamilInEnglish: "Konjam adakki vaasi kanna! Indha speed-la pona adutha vaaram kanji dhaan!",
        meaningInEnglish: "Tone it down a bit, my boy! At this rate, next week it's plain porridge!",
        movieReference: "Thillu Mullu",
        emoji: "🚨",
        vibe: "Reality Check"
      },
      {
        tamilInEnglish: "Naan late-ah vandhaalum latest-ah varuven... Aana un amount bayangarama latest-ah perusa irukku!",
        meaningInEnglish: "Even if I come late I come latest... But your spend amount is frighteningly big!",
        movieReference: "Baba",
        emoji: "⚡",
        vibe: "Heavy Weight"
      }
    ]
  },
  danger: {
    id: "danger",
    name: "ICU Level / Danger Zone 🚨",
    tagline: "Extreme Expenditure • High Alert Mode",
    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    borderColor: "border-rose-500/50",
    glowColor: "rgba(244, 63, 94, 0.5)",
    emojis: ["🚨", "💀", "🤯", "🔥", "💸", "👑"],
    dialogues: [
      {
        tamilInEnglish: "Aiyayyo! En kitta modhaadhe-nu sonnen la... Account balance ippo ICU la irukku kanna!",
        meaningInEnglish: "Oh no! Didn't I say don't mess with me?! Bank account is in the ICU now!",
        movieReference: "Murattu Kaalai / Baasha",
        emoji: "🚨",
        vibe: "ICU Alert"
      },
      {
        tamilInEnglish: "Kanna, bayam illaama selavu panradhu veera dhanam illa... Muthu padam climax maadiri total sacrifice!",
        meaningInEnglish: "Spending without fear isn't bravery... This is total sacrifice like Muthu climax!",
        movieReference: "Muthu",
        emoji: "💀",
        vibe: "Total Sacrifice"
      },
      {
        tamilInEnglish: "Adada! Indha speed-la pona, Ambani kooda un kitta loan kekka vandhuduvaan! Konjam thaangappa!",
        meaningInEnglish: "Goodness! If you spend at this velocity, even Ambani might ask you for a loan! Hold on!",
        movieReference: "Sivaji The Boss",
        emoji: "💸",
        vibe: "Billionaire Alert"
      },
      {
        tamilInEnglish: "Andha aandavan nallavangala sodhippaan, kaividamaattaan... Aana indha bill unna romba nalla sodhikudhu!",
        meaningInEnglish: "God tests good people but never abandons them... But this bill is truly testing you!",
        movieReference: "Padayappa",
        emoji: "🤯",
        vibe: "Divine Test"
      },
      {
        tamilInEnglish: "Thalaivar shock aayitaarpa! Seval koovurathukulla salary kaanama pochey!",
        meaningInEnglish: "Thalaivar himself is shocked! Before the rooster even crowed, the salary vanished!",
        movieReference: "Jailer / Baasha",
        emoji: "🔥",
        vibe: "Hukum Tiger"
      }
    ]
  }
};

/**
 * Determines the spending tier based on amount and monthly budget limit
 */
export function getThalaivarSpendingTier(amount: number, monthlyBudget: number = 15000): SpendingRateTier {
  const ratio = monthlyBudget > 0 ? (amount / monthlyBudget) : (amount / 15000);

  // If amount > 5000 or > 35% of budget -> Danger
  if (amount >= 5000 || ratio >= 0.35) {
    return THALAIVAR_TIERS.danger;
  }
  // If amount >= 1500 or > 15% of budget -> Heavy
  if (amount >= 1500 || ratio >= 0.15) {
    return THALAIVAR_TIERS.heavy;
  }
  // If amount >= 300 or > 3% of budget -> Mass
  if (amount >= 300 || ratio >= 0.03) {
    return THALAIVAR_TIERS.mass;
  }
  // Low spend
  return THALAIVAR_TIERS.chillarai;
}

/**
 * Selects a random dialogue from the determined tier
 */
export function getRandomThalaivarDialogue(tier: SpendingRateTier): ThalaivarDialogue {
  const list = tier.dialogues;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}
