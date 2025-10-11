
export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    address: string;
    phone: string;
    photoURL?: string;
    resumeUrl?: string;
    userType: 'standard' | 'recruiter';
}
