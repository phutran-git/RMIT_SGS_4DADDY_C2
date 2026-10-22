// The language corpora a community can run. Each corpus id is also the ONLY tag every
// encrypted story in it carries (RelationshipAttestation:1 requires tag == assignmentId).
export interface Corpus {
  id: string
  language: string
  nativeName: string
  community: string
  speakers: string
  sample: string
}

export const CORPORA: Corpus[] = [
  {
    id: 'corpus-khmer-krom',
    language: 'Khmer Krom',
    nativeName: 'ខ្មែរក្រោម',
    community: 'Khmer Krom communities, Mekong Delta (Sóc Trăng, Trà Vinh)',
    speakers: '~1.3M speakers in Vietnam',
    sample: 'កាលពីដើម មានក្មេងប្រុសម្នាក់ រស់នៅជិតទន្លេ។ គាត់ចូលចិត្តស្តាប់ជីតានិយាយរឿងព្រេង។',
  },
  {
    id: 'corpus-hmong',
    language: 'Hmong',
    nativeName: 'Hmoob',
    community: 'Hmong communities, northern highlands (Hà Giang, Lào Cai)',
    speakers: '~1.4M speakers in Vietnam',
    sample: 'Thaum ub muaj ib tug tub hluas nyob ntawm lub roob siab. Nws niam hais tias: tsis txhob hnov qab koj cov lus.',
  },
  {
    id: 'corpus-cham',
    language: 'Cham',
    nativeName: 'Cam',
    community: 'Cham communities, south-central coast (Ninh Thuận, Bình Thuận)',
    speakers: '~180K speakers in Vietnam',
    sample: 'Urang Cam hu sa boh tanran praong. Ama nyu panuec kadha di harei patao.',
  },
]

export const corpusById = (id: string) => CORPORA.find((c) => c.id === id)

// Reference translations of the synthetic sample sentences, used by the offline AI mock so the
// demo shows realistic pairs without an API key. Illustrative, not checked by native speakers.
export const SAMPLE_TRANSLATIONS: { source: string; en: string; vi: string }[] = [
  { source: 'កាលពីដើម មានក្មេងប្រុសម្នាក់ រស់នៅជិតទន្លេ។', en: 'Long ago, there was a boy who lived near the river.', vi: 'Ngày xưa, có một cậu bé sống gần dòng sông.' },
  { source: 'គាត់ចូលចិត្តស្តាប់ជីតានិយាយរឿងព្រេង។', en: 'He loved listening to his grandfather tell legends.', vi: 'Cậu thích nghe ông kể chuyện cổ tích.' },
  { source: 'Thaum ub muaj ib tug tub hluas nyob ntawm lub roob siab.', en: 'Long ago, a young man lived on a high mountain.', vi: 'Ngày xưa, có một chàng trai sống trên núi cao.' },
  { source: 'Nws niam hais tias: tsis txhob hnov qab koj cov lus.', en: 'His mother said: never forget your language.', vi: 'Mẹ anh dặn: đừng bao giờ quên tiếng nói của mình.' },
  { source: 'Urang Cam hu sa boh tanran praong.', en: 'The Cham people have a great tradition.', vi: 'Người Chăm có một truyền thống lớn.' },
  { source: 'Ama nyu panuec kadha di harei patao.', en: 'His father told stories of the days of the kings.', vi: 'Cha anh kể chuyện về thời các vua.' },
  { source: 'Gọi tôi: [PHONE].', en: 'Call me: [PHONE].', vi: 'Gọi tôi: [PHONE].' },
]
