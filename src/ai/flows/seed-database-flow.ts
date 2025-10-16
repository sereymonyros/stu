
'use server';
/**
 * @fileOverview A flow to seed the Firestore database with test data.
 * It creates specific test users and job postings associated with them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';


const SeedDatabaseOutputSchema = z.object({
  message: z.string(),
  usersCreated: z.number(),
  jobsCreatedForUser1: z.number(),
  jobsCreatedForUser2: z.number(),
  totalJobsCreated: z.number(),
});
export type SeedDatabaseOutput = z.infer<typeof SeedDatabaseOutputSchema>;

// No input needed for this flow
const SeedDatabaseInputSchema = z.object({});

export async function seedDatabase(): Promise<SeedDatabaseOutput> {
  // Pass an empty object to satisfy the flow's input schema.
  return seedDatabaseFlow({});
}

// Helper function to create or get a user
async function createOrGetUser(auth: any, firestore: any, email: string, displayName: string, userType: 'recruiter' | 'standard' = 'recruiter'): Promise<{user: UserRecord, created: boolean}> {
    try {
        const user = await auth.getUserByEmail(email);
        return { user, created: false };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const userRecord = await auth.createUser({
                email,
                password: 'password',
                displayName,
            });
            await firestore.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                displayName,
                email,
                address: `123 ${displayName.split(' ')[0]} Street`,
                phone: '555-555-5555',
                userType: userType,
                photoURL: `https://i.pravatar.cc/150?u=${email}`
            });
            return { user: userRecord, created: true };
        }
        throw error;
    }
}


const seedDatabaseFlow = ai.defineFlow(
  {
    name: 'seedDatabaseFlow',
    inputSchema: SeedDatabaseInputSchema,
    outputSchema: SeedDatabaseOutputSchema,
  },
  async () => {
    const { auth, firestore } = initializeFirebaseAdmin();
    let usersCreated = 0;
    let jobsCreatedForUser1 = 0;
    let jobsCreatedForUser2 = 0;

    const locations = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampot'];
    const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];

    try {
      // --- User 1: 6b43Hazb5dWAygJrWly999YbnvM2 ---
      const user1Email = 'sereymonyros@gmail.com';
      const user1Result = await createOrGetUser(auth, firestore, user1Email, 'Sereymony Ros');
      const user1 = user1Result.user;
      if (user1Result.created) usersCreated++;

      const user1Jobs = [
        { 
          title: 'Lead Blockchain Developer', 
          company: 'CryptoCambodia',
          description: `CryptoCambodia is seeking an experienced Lead Blockchain Developer to spearhead our efforts in building next-generation decentralized applications. You will be responsible for the architecture, design, and implementation of our core blockchain protocols and smart contracts. This role requires a deep understanding of cryptographic principles, consensus algorithms, and distributed systems. You will lead a small team of talented developers, providing mentorship and technical guidance. The ideal candidate has 5+ years of experience with Solidity, Rust, or a similar language, and a proven track record of deploying secure and scalable smart contracts to a mainnet environment. Experience with Layer 2 scaling solutions is a major plus.`
        },
        { 
          title: 'AI/ML Engineer', 
          company: 'AI Solutions Khmer',
          description: `Join AI Solutions Khmer and work on cutting-edge machine learning models that solve real-world problems for businesses across Southeast Asia. As an AI/ML Engineer, you will research, design, and implement predictive models, recommendation engines, and natural language processing solutions. You will be responsible for the full lifecycle of model development, from data collection and preprocessing to training, evaluation, and deployment. We are looking for candidates with a strong foundation in statistics, a passion for data, and proficiency in Python and popular ML frameworks like TensorFlow, PyTorch, or Scikit-learn. A Master's degree or PhD in a quantitative field is preferred.`
        },
        { 
          title: 'Senior Cloud Architect', 
          company: 'Mekong Cloud Services',
          description: `Mekong Cloud Services is a leading cloud provider in the region, and we're looking for a Senior Cloud Architect to design and implement robust, scalable, and secure cloud infrastructure for our enterprise clients. You will work directly with customers to understand their needs and translate them into technical solutions on our platform. You must be an expert in IaaS and PaaS, with deep knowledge of containerization (Docker, Kubernetes), infrastructure-as-code (Terraform, Ansible), and networking concepts. Certifications in AWS, GCP, or Azure are highly desirable. This is a client-facing role that requires excellent communication and presentation skills.`
        },
        { 
          title: 'Mobile Development Lead (React Native)', 
          company: 'Angkor App Development',
          description: `Angkor App Development is a fast-growing mobile studio that builds beautiful and performant apps for startups and established brands. We are looking for a Mobile Development Lead to guide our React Native team. You will be a hands-on leader, responsible for setting technical direction, enforcing best practices, and mentoring junior developers. You will also be heavily involved in the architecture and development of our most complex projects. The ideal candidate has at least 6 years of mobile development experience, with a minimum of 3 years focused on React Native. You should have published several apps to both the Apple App Store and Google Play Store.`
        },
        { 
          title: 'Cybersecurity Analyst', 
          company: 'CyberGuardians',
          description: `As a Cybersecurity Analyst at CyberGuardians, you will be on the front lines of protecting our clients from digital threats. Your primary responsibilities will include monitoring security alerts, investigating incidents, conducting vulnerability assessments, and implementing security controls. You will work with a variety of tools, including SIEM, IDS/IPS, and endpoint detection and response (EDR) solutions. We are looking for a highly analytical and detail-oriented individual with a passion for security. A Bachelor's degree in Cybersecurity or a related field, along with certifications like CompTIA Security+ or CEH, is strongly preferred.`
        },
        { 
          title: 'Head of Digital Marketing', 
          company: 'Digital Pagoda',
          description: `Digital Pagoda is a full-service digital agency looking for a dynamic and experienced Head of Digital Marketing to lead our client strategy team. You will be responsible for developing and executing comprehensive digital marketing campaigns that drive measurable results. This includes managing SEO, SEM, social media, content marketing, and email marketing efforts. You will lead a team of specialists, manage client relationships, and be responsible for the overall growth and success of the department. A minimum of 7 years of experience in digital marketing, with at least 3 years in a leadership role, is required.`
        },
        { 
          title: 'E-commerce Manager', 
          company: 'KhmerCart',
          description: `KhmerCart is one of Cambodia's largest online marketplaces. We are seeking an experienced E-commerce Manager to oversee our platform's sales and marketing strategy. You will be responsible for driving traffic, improving conversion rates, and increasing average order value. Your duties will include managing online advertising campaigns (Google Ads, Facebook Ads), optimizing product listings, developing promotional calendars, and analyzing sales data to identify trends and opportunities. Experience with platforms like Shopify, Magento, or WooCommerce is essential. You must be data-driven and have a strong understanding of the entire e-commerce funnel.`
        },
        { 
          title: 'Chief Technology Officer (CTO)', 
          company: 'Startup Hub PP',
          description: `Startup Hub PP, a leading tech incubator, is searching for a visionary Chief Technology Officer (CTO) to provide technical leadership and strategy for our portfolio companies. You will act as a fractional CTO for multiple startups, helping them build their MVP, scale their technology, and hire their initial engineering teams. This is a unique opportunity to influence the trajectory of the next wave of Cambodian startups. You must be a seasoned technologist with a broad range of experience across different stacks and architectures. Previous startup experience, especially in a leadership role, is essential. Strong business acumen and communication skills are required.`
        },
        { 
          title: 'Principal UI/UX Designer', 
          company: 'Banyan UX',
          description: `Banyan UX is a design-centric agency dedicated to creating intuitive and beautiful user experiences. We are looking for a Principal UI/UX Designer to lead our most important projects and mentor our design team. You will be responsible for the entire design process, from user research and wireframing to high-fidelity prototyping and user testing. You must have a stunning portfolio that showcases your expertise in both UX strategy and visual design. Mastery of tools like Figma, Sketch, and Adobe Creative Suite is a given. You should be a passionate advocate for the user and have a deep understanding of design thinking principles.`
        },
        { 
          title: 'Director of Engineering', 
          company: 'FutureTech Cambodia',
          description: `FutureTech Cambodia is a well-funded R&D lab focused on creating innovative hardware and software solutions. We are hiring a Director of Engineering to lead and grow our entire engineering organization. You will be responsible for managing multiple teams, setting technical strategy, driving product execution, and fostering a culture of excellence and innovation. This is a senior leadership role that requires a strong technical background combined with exceptional management and people skills. You should have at least 10 years of experience in software development, with 5+ years in a management role, leading teams of 20 or more engineers.`
        },
      ];

      for (const job of user1Jobs) {
        const jobData = {
          title: job.title,
          companyName: job.company,
          description: job.description,
          location: locations[jobsCreatedForUser1 % locations.length],
          jobType: jobTypes[jobsCreatedForUser1 % jobTypes.length],
          status: 'Available',
          salaryMin: 90000 + (jobsCreatedForUser1 * 10000),
          salaryMax: 120000 + (jobsCreatedForUser1 * 10000),
          recruiterId: user1.uid,
          recruiterDisplayName: user1.displayName,
          createdAt: FieldValue.serverTimestamp(),
        };
        await firestore.collection('jobs').add(jobData);
        jobsCreatedForUser1++;
      }
      
      // --- User 2: zsxcTqelyFashlfKMrXKAYvAJ783 ---
      const user2Email = 'testrecruiter@example.com';
      const user2Result = await createOrGetUser(auth, firestore, user2Email, 'Test Recruiter');
      const user2 = user2Result.user;
       if (user2Result.created) usersCreated++;

      const user2Jobs = [
        { 
          title: 'Junior Frontend Developer', 
          company: 'WebWeavers',
          description: `WebWeavers is looking for an enthusiastic Junior Frontend Developer to join our team. In this role, you will work closely with our designers and senior developers to build responsive and interactive user interfaces for our clients' websites. You will learn to write clean, efficient, and maintainable code using HTML, CSS, and JavaScript. This is a fantastic opportunity for a recent graduate or someone with 1-2 years of experience to grow their skills in a supportive environment. A basic understanding of a modern JavaScript framework like React, Vue, or Angular is a plus.`
        },
        { 
          title: 'Graphic Designer', 
          company: 'Creative Circle',
          description: `Creative Circle, a boutique advertising agency, is seeking a talented Graphic Designer to create compelling visual assets for our diverse range of clients. You will work on everything from branding and logo design to social media graphics and print materials. You must have a strong portfolio, a keen eye for detail, and proficiency in Adobe Creative Suite (Photoshop, Illustrator, InDesign). This role requires creativity, the ability to work to a brief, and excellent time management skills to handle multiple projects simultaneously. You will collaborate with copywriters and account managers to bring creative concepts to life.`
        },
        { 
          title: 'Customer Support Specialist', 
          company: 'Helpful Hands',
          description: `Helpful Hands provides world-class customer support for a variety of tech companies. We are hiring a Customer Support Specialist to be the first point of contact for our users. You will be responsible for answering customer inquiries via email, chat, and phone, troubleshooting issues, and escalating complex problems to the appropriate team. The ideal candidate is patient, empathetic, and has excellent communication skills. You must be a problem-solver who is passionate about helping people. Previous experience in a customer-facing role is highly desirable. Fluency in both Khmer and English is required.`
        },
        { 
          title: 'IT Helpdesk Technician', 
          company: 'TechFixers',
          description: `TechFixers provides IT support for small and medium-sized businesses in Phnom Penh. We are looking for an IT Helpdesk Technician to provide technical assistance to our clients. Your responsibilities will include troubleshooting hardware and software issues, setting up new user accounts, and maintaining office networks. This is a hands-on role that requires a good understanding of computer systems, mobile devices, and other tech products. Strong problem-solving skills and a customer-service orientation are essential. Experience with Windows and macOS environments is required.`
        },
        { 
          title: 'Social Media Manager', 
          company: 'BuzzBuilders',
          description: `Are you passionate about social media? BuzzBuilders, a fast-growing PR firm, is looking for a Social Media Manager to manage the online presence of our clients. You will be responsible for creating and scheduling content, engaging with followers, running social media ad campaigns, and analyzing performance metrics. You should have a deep understanding of all major social media platforms (Facebook, Instagram, TikTok, LinkedIn) and their respective best practices. Excellent writing skills, a creative mindset, and the ability to track and interpret analytics are crucial for this role. Experience with social media management tools like Hootsuite or Buffer is a plus.`
        },
      ];

       for (const job of user2Jobs) {
        const jobData = {
          title: job.title,
          companyName: job.company,
          description: job.description,
          location: locations[jobsCreatedForUser2 % locations.length],
          jobType: jobTypes[jobsCreatedForUser2 % jobTypes.length],
          status: 'Available',
          salaryMin: 40000 + (jobsCreatedForUser2 * 2000),
          salaryMax: 55000 + (jobsCreatedForUser2 * 2000),
          recruiterId: user2.uid,
          recruiterDisplayName: user2.displayName,
          createdAt: FieldValue.serverTimestamp(),
        };
        await firestore.collection('jobs').add(jobData);
        jobsCreatedForUser2++;
      }
      
      // --- Create one standard user for testing applications ---
      const standardUserResult = await createOrGetUser(auth, firestore, 'standarduser@example.com', 'Standard User', 'standard');
      if (standardUserResult.created) usersCreated++;


      const totalJobsCreated = jobsCreatedForUser1 + jobsCreatedForUser2;
      const message = `Database seeding complete. ${totalJobsCreated} jobs and ${usersCreated} users were newly created.`;
      
      return { 
          message, 
          usersCreated,
          jobsCreatedForUser1, 
          jobsCreatedForUser2, 
          totalJobsCreated 
      };

    } catch (error: any) {
      console.error('Error seeding database:', error);
      throw new Error(`Failed to seed database: ${error.message}`);
    }
  }
);
