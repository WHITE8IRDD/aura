import adblockIcon from '../assets/extension-icons/adblock.svg'
import privacyIcon from '../assets/extension-icons/privacy.svg'
import passwordsIcon from '../assets/extension-icons/passwords.svg'
import themeIcon from '../assets/extension-icons/theme.svg'
import productivityIcon from '../assets/extension-icons/productivity.svg'
import developerIcon from '../assets/extension-icons/developer.svg'
import shoppingIcon from '../assets/extension-icons/shopping.svg'
import mediaIcon from '../assets/extension-icons/media.svg'
import writingIcon from '../assets/extension-icons/writing.svg'
import notesIcon from '../assets/extension-icons/notes.svg'
import securityIcon from '../assets/extension-icons/security.svg'
import defaultIcon from '../assets/extension-icons/default.svg'

export type CatalogCategory =
  | 'Ad Blocker' | 'Privacy' | 'Passwords' | 'Theme' | 'Productivity'
  | 'Developer' | 'Shopping' | 'Media' | 'Writing' | 'Notes' | 'Security'

export interface CatalogEntry {
  id: string
  name: string
  description: string
  category: CatalogCategory
}

const CATEGORY_ICON: Record<CatalogCategory, string> = {
  'Ad Blocker': adblockIcon,
  'Privacy': privacyIcon,
  'Passwords': passwordsIcon,
  'Theme': themeIcon,
  'Productivity': productivityIcon,
  'Developer': developerIcon,
  'Shopping': shoppingIcon,
  'Media': mediaIcon,
  'Writing': writingIcon,
  'Notes': notesIcon,
  'Security': securityIcon
}

export function getCatalogIconSrc(entry: CatalogEntry): string {
  return CATEGORY_ICON[entry.category] ?? defaultIcon
}

export const EXTENSIONS_CATALOG: CatalogEntry[] = [
  { id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', name: 'uBlock Origin', description: 'Efficient blocker — easy on CPU and memory', category: 'Ad Blocker' },
  { id: 'ddkjiahejlhfcafbddmgiahkhanlnbbm', name: 'uBlock Origin Lite', description: 'Lightweight content blocker for Manifest V3', category: 'Ad Blocker' },
  { id: 'gighmmpiobklfepjocnamgkkbiglidom', name: 'AdBlock', description: 'Block ads all over the web', category: 'Ad Blocker' },
  { id: 'cfhdojbkjhnklbpkdaibdccddilifddb', name: 'Adblock Plus', description: 'Block ads and pop-ups online', category: 'Ad Blocker' },
  { id: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp', name: 'Privacy Badger', description: 'Automatically learns to block invisible trackers', category: 'Privacy' },
  { id: 'jlmpjdjjbgclbocgajdjefcidcncaied', name: 'DuckDuckGo Privacy Essentials', description: 'Privacy, simplified', category: 'Privacy' },
  { id: 'mnjggcdmjocbbbhaepdhchncahnbgone', name: 'SponsorBlock for YouTube', description: 'Skip sponsored segments in YouTube videos', category: 'Privacy' },
  { id: 'nngceckbapebfimnlniiiahkandclblb', name: 'Bitwarden', description: 'Free, open-source password manager', category: 'Passwords' },
  { id: 'hdokiejnpimakedhajhdlcegeplioahd', name: 'LastPass', description: 'Free password manager', category: 'Passwords' },
  { id: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa', name: '1Password', description: 'Password manager and digital vault', category: 'Passwords' },
  { id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', name: 'Dark Reader', description: 'Dark mode for every website', category: 'Theme' },
  { id: 'dbepggeogbaibhgnhhndojpepiihcmeb', name: 'Vimium', description: 'Keyboard shortcuts for navigation and control', category: 'Productivity' },
  { id: 'jjmflmamggggndanpgfnpelongoepncg', name: 'Google Translate', description: 'Translate web pages', category: 'Productivity' },
  { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools', description: 'Inspect React component hierarchies', category: 'Developer' },
  { id: 'lmhkpmbekcpmknklioeibfkpmmfibljd', name: 'Redux DevTools', description: 'Redux DevTools for debugging', category: 'Developer' },
  { id: 'nhdogjmejiglipccpnnnanhbledajbpd', name: 'Vue.js devtools', description: 'Inspect Vue components', category: 'Developer' },
  { id: 'bfbameneiokkgbdmiekhjnmfkcnldhhm', name: 'Web Developer', description: 'Adds web developer tools', category: 'Developer' },
  { id: 'hfhgpkbamboflojanflfbjebfopbhkmf', name: 'Wappalyzer', description: 'Identify technology on websites', category: 'Developer' },
  { id: 'bmnlcjabgnpnenekpadlanbbkooimhnj', name: 'Honey', description: 'Automatic coupons and cash back', category: 'Shopping' },
  { id: 'gkkmiofalnjagdcjheckamobghglpdpm', name: 'Enhancer for YouTube', description: 'Cinema mode, customize speed, AdBlock for YouTube', category: 'Media' },
  { id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly', description: 'Grammar and spelling checker', category: 'Writing' },
  { id: 'pioclpoplcdbaefihamjohnefbikjilc', name: 'Evernote Web Clipper', description: 'Save anything from the web to Evernote', category: 'Notes' },
  { id: 'gomekmidlodglbbmalcneegieacbdmki', name: 'Avast Online Security', description: 'Browse safely with Avast', category: 'Security' }
]
