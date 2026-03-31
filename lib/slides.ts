export type Slide = {
  id: number;
  slug: string;
  title: string;
  quote: string[];
  video: string;
  finalFrame: string;
  alt: string;
  kicker: string;
  moment: string;
  palette: {
    accent: string;
    glow: string;
    shadow: string;
    panel: string;
    edge: string;
  };
};

export const slides: Slide[] = [
  {
    id: 1,
    slug: "honest",
    title: "Honest",
    kicker: "The mind without drag",
    moment: "Light enters where hiding stops.",
    quote: [
      "The selfish reason to be honest is to clear the mind of exhausting lies and to navigate towards people and situations where you can be completely authentic.",
    ],
    video: "/grok/01.mp4",
    finalFrame: "/final-frames/01.jpg",
    alt: "Animated Honest scene.",
    palette: {
      accent: "#2f5671",
      glow: "rgba(123, 179, 214, 0.3)",
      shadow: "rgba(35, 56, 74, 0.2)",
      panel: "rgba(244, 249, 252, 0.62)",
      edge: "rgba(47, 86, 113, 0.18)",
    },
  },
  {
    id: 2,
    slug: "love",
    title: "Love",
    kicker: "The richer side of feeling",
    moment: "To love is already a reward.",
    quote: [
      "The selfish reason to love is that it feels better to be in love than to be loved (but don’t expect much back).",
    ],
    video: "/grok/02.mp4",
    finalFrame: "/final-frames/02.jpg",
    alt: "Animated Love scene.",
    palette: {
      accent: "#8e4f5e",
      glow: "rgba(212, 144, 164, 0.34)",
      shadow: "rgba(91, 44, 59, 0.2)",
      panel: "rgba(253, 245, 248, 0.62)",
      edge: "rgba(142, 79, 94, 0.18)",
    },
  },
  {
    id: 3,
    slug: "ethical",
    title: "Ethical",
    kicker: "Your signal finds its peers",
    moment: "Integrity attracts a better network.",
    quote: [
      "The selfish reason to be ethical is that it attracts the other ethical people in the network.",
    ],
    video: "/grok/03.mp4",
    finalFrame: "/final-frames/03.jpg",
    alt: "Animated Ethical scene.",
    palette: {
      accent: "#6c5a2c",
      glow: "rgba(210, 184, 101, 0.34)",
      shadow: "rgba(82, 67, 29, 0.2)",
      panel: "rgba(252, 248, 237, 0.62)",
      edge: "rgba(108, 90, 44, 0.18)",
    },
  },
  {
    id: 4,
    slug: "temperate",
    title: "Temperate",
    kicker: "Enough keeps life vivid",
    moment: "Pleasure returns when excess leaves.",
    quote: [
      "The selfish reason to be temperate is that overindulgence desensitizes you to the subtle everyday pleasures of life.",
    ],
    video: "/grok/04.mp4",
    finalFrame: "/final-frames/04.jpg",
    alt: "Animated Temperate scene.",
    palette: {
      accent: "#6a4f27",
      glow: "rgba(202, 150, 86, 0.3)",
      shadow: "rgba(79, 54, 24, 0.2)",
      panel: "rgba(252, 247, 240, 0.62)",
      edge: "rgba(106, 79, 39, 0.18)",
    },
  },
  {
    id: 5,
    slug: "humble",
    title: "Humble",
    kicker: "Lighter when self shrinks",
    moment: "The burden lifts when ego softens.",
    quote: [
      "The selfish reason to be humble is that the more seriously you take yourself, the unhappier you’re going to be.",
    ],
    video: "/grok/05.mp4",
    finalFrame: "/final-frames/05.jpg",
    alt: "Animated Humble scene.",
    palette: {
      accent: "#5b5f78",
      glow: "rgba(160, 166, 218, 0.28)",
      shadow: "rgba(54, 57, 77, 0.2)",
      panel: "rgba(246, 247, 252, 0.6)",
      edge: "rgba(91, 95, 120, 0.18)",
    },
  },
  {
    id: 6,
    slug: "faithful-dutiful",
    title: "Dutiful",
    kicker: "A self anchored outside itself",
    moment: "Devotion gives weight to life.",
    quote: [
      "The selfish reason to be faithful or dutiful is that it gives you something to care about more than yourself.",
    ],
    video: "/grok/06.mp4",
    finalFrame: "/final-frames/06.jpg",
    alt: "Animated Faithful / dutiful scene.",
    palette: {
      accent: "#7b4638",
      glow: "rgba(207, 141, 120, 0.32)",
      shadow: "rgba(84, 47, 37, 0.2)",
      panel: "rgba(252, 245, 241, 0.62)",
      edge: "rgba(123, 70, 56, 0.18)",
    },
  },
  {
    id: 7,
    slug: "thrifty",
    title: "Thrifty",
    kicker: "Freedom hides in lower needs",
    moment: "Less dependence, more air.",
    quote: [
      "The selfish reason to be thrifty is that living far below your means frees you from obsessing over money.",
    ],
    video: "/grok/07.mp4",
    finalFrame: "/final-frames/07.jpg",
    alt: "Animated Thrifty scene.",
    palette: {
      accent: "#48624d",
      glow: "rgba(135, 182, 142, 0.3)",
      shadow: "rgba(45, 68, 49, 0.2)",
      panel: "rgba(245, 250, 245, 0.62)",
      edge: "rgba(72, 98, 77, 0.18)",
    },
  },
  {
    id: 8,
    slug: "honorable",
    title: "Honorable",
    kicker: "The witness within remembers",
    moment: "You carry your own verdict.",
    quote: [
      "The selfish reason to be honorable is that self-esteem is just the reputation that you have with yourself. You’ll always know.",
    ],
    video: "/grok/08.mp4",
    finalFrame: "/final-frames/08.jpg",
    alt: "Animated Honorable scene.",
    palette: {
      accent: "#714235",
      glow: "rgba(206, 152, 128, 0.3)",
      shadow: "rgba(86, 53, 42, 0.2)",
      panel: "rgba(252, 246, 242, 0.62)",
      edge: "rgba(113, 66, 53, 0.18)",
    },
  },
  {
    id: 9,
    slug: "calm",
    title: "Calm",
    kicker: "Composure over combustion",
    moment: "A room settles after heat.",
    quote: [
      "The selfish reason to be calm is that anger burns you first before burning the other.",
      "A cool and calm person is more effective than an angry and agitated one.",
    ],
    video: "/grok/09.mp4",
    finalFrame: "/final-frames/09.jpg",
    alt: "Animated Calm scene.",
    palette: {
      accent: "#7a1f23",
      glow: "rgba(198, 117, 97, 0.34)",
      shadow: "rgba(74, 35, 24, 0.2)",
      panel: "rgba(255, 250, 245, 0.62)",
      edge: "rgba(122, 31, 35, 0.18)",
    },
  },
  {
    id: 10,
    slug: "forgive",
    title: "Forgive",
    kicker: "Release without hurry",
    moment: "Leaving the wound behind, slowly.",
    quote: [
      "The selfish reason to forgive is so that you can move on with the rest of your life (but you can’t fake it or rush it).",
    ],
    video: "/grok/10.mp4",
    finalFrame: "/final-frames/10.jpg",
    alt: "Animated Forgive scene.",
    palette: {
      accent: "#74513d",
      glow: "rgba(214, 177, 144, 0.34)",
      shadow: "rgba(91, 67, 54, 0.2)",
      panel: "rgba(252, 247, 241, 0.64)",
      edge: "rgba(116, 81, 61, 0.18)",
    },
  },
  {
    id: 11,
    slug: "selfless",
    title: "Selfless",
    kicker: "Happiness arrives sideways",
    moment: "Warmth expands when the ego loosens.",
    quote: ["The selfish person realizes that happiness belongs to the self-less."],
    video: "/grok/11.mp4",
    finalFrame: "/final-frames/11.jpg",
    alt: "Animated Selfless scene.",
    palette: {
      accent: "#44665a",
      glow: "rgba(140, 190, 170, 0.28)",
      shadow: "rgba(41, 68, 58, 0.2)",
      panel: "rgba(245, 250, 247, 0.6)",
      edge: "rgba(68, 102, 90, 0.18)",
    },
  },
];
