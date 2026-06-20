// src/utils/i18n.js
export const STRINGS = {
  appTagline: { en: 'Fast. Local. Trusted.', te: 'వేగంగా. స్థానికంగా. విశ్వసనీయంగా.' },
  getStarted: { en: 'Get Started', te: 'మొదలు పెట్టండి' },
  login: { en: 'Log In', te: 'లాగిన్' },
  continueAsReader: { en: 'Continue as Reader', te: 'రీడర్‌గా కొనసాగండి' },
  noAccount: { en: "Don't have an account?", te: 'ఖాతా లేదా?' },
  register: { en: 'Register', te: 'నమోదు చేయండి' },
  home: { en: 'Home', te: 'హోమ్' },
  search: { en: 'Search', te: 'వెతకండి' },
  bookmarks: { en: 'Saved', te: 'సేవ్ చేసినవి' },
  profile: { en: 'Profile', te: 'ప్రొఫైల్' },
  trending: { en: 'Trending', te: 'ట్రెండింగ్' },
  readMore: { en: 'Read full story', te: 'పూర్తి వార్త చదవండి' },
  share: { en: 'Share', te: 'షేర్ చేయండి' },
  save: { en: 'Save', te: 'సేవ్ చేయండి' },
  report: { en: 'Report', te: 'రిపోర్ట్ చేయండి' },
  submitNews: { en: 'Submit News', te: 'వార్త పంపండి' },
  generateDraft: { en: 'Generate AI Draft', te: 'AI డ్రాఫ్ట్ సృష్టించండి' },
  submitForApproval: { en: 'Submit for Approval', te: 'ఆమోదానికి పంపండి' },
  pending: { en: 'Pending', te: 'పెండింగ్‌లో ఉంది' },
  approved: { en: 'Approved', te: 'ఆమోదించబడింది' },
  rejected: { en: 'Rejected', te: 'తిరస్కరించబడింది' }
}

export const t = (key, lang = 'en') => STRINGS[key]?.[lang] || STRINGS[key]?.en || key
