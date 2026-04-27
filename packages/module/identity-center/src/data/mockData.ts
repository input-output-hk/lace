export interface Credential {
  id: string;
  type: 'age' | 'biometrics' | 'humanity' | 'in-person' | 'passport';
  title: string;
  subtitle: string; // e.g. "by Didit.me"
  status: 'expired' | 'revoked' | 'valid';
  expirationDate?: string;
}

export interface Connection {
  id: string;
  name: string;
  type: 'discord' | 'other';
  status: 'connected' | 'processing';
  icon?: string; // URL or local asset ref (mocked as string)
  humanityProof?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  status: 'failed' | 'pending' | 'success';
}

export interface User {
  name: string;
  did: string;
  qrCode: string;
}

export const MOCK_USER: User = {
  name: 'Allan Leone',
  did: 'did:prism:ID9993jjasdjhasd9j3kmaaassasdasdasdfF0i09dfdfd8...sd8uj',
  qrCode: 'mock-qr-code-string', // In real app this would be generated
};

export const MOCK_CREDENTIALS: Credential[] = [
  {
    id: '1',
    type: 'humanity',
    title: 'Humanity Proof',
    subtitle: 'by Didit.me',
    status: 'valid',
    expirationDate: '20/08/2026',
  },
  {
    id: '2',
    type: 'age',
    title: 'Age',
    subtitle: 'by Didit.me',
    status: 'valid',
    expirationDate: '20/08/2026',
  },
  {
    id: '3',
    type: 'biometrics',
    title: 'Biometrics',
    subtitle: 'Expired',
    status: 'expired',
  },
  {
    id: '4',
    type: 'passport',
    title: 'Passport / Nationality',
    subtitle: 'Expired',
    status: 'expired', // Using 'expired' to match the red icon in mockup
  },
  {
    id: '5',
    type: 'in-person',
    title: 'In Person',
    subtitle: 'Expired',
    status: 'expired',
  },
];

export const MOCK_CONNECTIONS: Connection[] = [
  {
    id: '1',
    name: 'Lace',
    type: 'discord',
    status: 'connected',
    humanityProof: true,
  },
  {
    id: '2',
    name: 'Atrium',
    type: 'discord',
    status: 'connected',
    humanityProof: true,
  },
  {
    id: '3',
    name: 'Lace',
    type: 'discord',
    status: 'connected',
    humanityProof: true,
  },
];

export const MOCK_ACTIVITY: Activity[] = [
  {
    id: '1',
    title: 'Connected to Lace',
    date: 'Today, 12:00',
    status: 'success',
  },
  {
    id: '2',
    title: 'Credential Verification',
    date: 'Yesterday',
    status: 'success',
  },
];
