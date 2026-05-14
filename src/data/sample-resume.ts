import type { Resume } from "@/types/resume";

export const sampleResume: Resume = {
  title: "IT Support Technician Resume",
  header: {
    name: "Cesar Hernandez Lopez",
    email: "cesarhernandezl@proton.me",
    phone: "(503)544-6881",
    location: "Beaverton, Oregon",
    links: [],
  },
  summary:
    "IT support technician with 6+ years of experience delivering desktop, mobile, and end-user support across macOS, Windows, and Linux environments. Hands-on experience with Active Directory user provisioning, Group Policy, and Microsoft 365 administration. Experienced with LAN/WAN troubleshooting, network connectivity, VPN, and DNS. Practiced in ITIL-aligned ticketing workflows, SLA management, knowledge base administration, and technical documentation. Bilingual in English and Spanish. CompTIA A+ in progress.",
  technicalSkills: {
    title: "Technical Skills",
    categories: [
      {
        id: "platforms-os",
        label: "Platforms & Operating Systems",
        value: "Windows 10/11, Windows Server, macOS, iOS, Linux (Ubuntu)",
      },
      {
        id: "administration",
        label: "Administration",
        value:
          "Active Directory, Azure AD, Group Policy, Microsoft 365, Google Workspace, PowerShell (basic), Docker, Git, SSH",
      },
      {
        id: "device-management-virtualization",
        label: "Device Management & Virtualization",
        value:
          "Apple Business Essentials, Intune (foundational), SCCM (foundational), Proxmox, VirtualBox, RDP, Tailscale, asset inventory",
      },
      {
        id: "networking-security",
        label: "Networking & Security",
        value:
          "TCP/IP, DNS, DHCP, VPN, Wi-Fi, IP routing, DNS filtering, secure remote access, data backup",
      },
      {
        id: "itsm-support",
        label: "ITSM & Support",
        value:
          "Ticketing systems (self-hosted, Spiceworks), SLA management, knowledge base administration, ITIL concepts",
      },
      {
        id: "hardware-support",
        label: "Hardware & Support",
        value:
          "Laptop/desktop, PC assembly, mobile devices, printers, routers, bilingual (English/Spanish), CompTIA A+ in progress",
      },
    ],
  },
  experience: [
    {
      company: "INDEPENDENT",
      title: "IT Support Technician",
      location: "Beaverton, OR",
      dateRange: {
        startMonth: "Jun",
        startYear: "2022",
        current: true,
      },
      bullets: [
        "Delivered 350+ hours of in person and remote desktop support to small business clients, resolving hardware, software, and network issues across Windows, macOS, and Linux.",
        "Administered user accounts in Windows Server AD, onboarding/offboarding, password resets, group membership, permissions, and SSO configuration.",
        "Configured VoIP systems (Google Voice, Zoom Phone) including call routing, license and number management, and user onboarding.",
        "Set up virtual machines for client and lab environments with internal only and VPN gated remote access via Tailscale and SSH.",
        "Managed mobile devices for clients including enrollment, app distribution, restriction profiles, and device health monitoring.",
        "Managed LAN/WAN networking: Wi-Fi, ethernet, DNS filtering, DHCP, IP troubleshooting, VPN, and basic routing for home and small office environments.",
        "Provisioned laptops from scratch, enrolling devices into Active Directory, installing software, documenting assets, and delivering user training.",
        "Built and administered ITSM ticketing system with SLA tiers, priority classification, knowledge base, and LLM-powered ticket simulation for structured and compliance practice.",
        "Created SOPs, troubleshooting guides, and knowledge base articles aligned with ITIL incident and change management practices.",
      ],
    },
    {
      company: "APPLE INC.",
      title: "Specialist",
      location: "Portland, OR",
      dateRange: {
        startMonth: "Aug",
        startYear: "2021",
        endMonth: "Feb",
        endYear: "2025",
      },
      bullets: [
        "Provided daily in-person support to 30+ individuals and business clients, resolving hardware, software, and account issues across Apple devices and mobile platforms.",
        "Supported device setup, data migration, account configuration, and mobile device enrollment for iOS and macOS, including managed device workflows for business clients.",
        "Triaged and managed support queues using Apple's internal ticketing system, classifying incidents, documenting resolutions, and escalating appropriately within a structured support workflow.",
        "Maintained customer satisfaction scores in the top 10% of store benchmarks through clear communication and effective support for users of all technical backgrounds.",
      ],
    },
    {
      company: "XEROX",
      title: "AppleCare Advisor",
      location: "Tigard, OR",
      dateRange: {
        startMonth: "Jul",
        startYear: "2016",
        endMonth: "Jun",
        endYear: "2017",
      },
      bullets: [
        "Delivered Tier 1 remote technical support via phone and chat, resolving account, connectivity, and device issues within defined SLA standards.",
        "Followed structured troubleshooting procedures, documented all actions and outcomes, and escalated issues with clear notes to support faster resolution.",
      ],
    },
  ],
  projects: [],
  education: [
    {
      school: "Western Governors University",
      degree: "B.S. in Computer Science",
      dateRange: {
        startMonth: "Sept",
        startYear: "2023",
        endMonth: "Nov",
        endYear: "2026",
      },
      location: "Salt Lake City, UT",
      coursework: [
        "Network and Security Foundations",
        "Operating Systems",
        "IT Fundamentals",
        "Web Development (HTML/CSS/JS)",
        "Software Engineering",
        "Data Structures and Algorithms",
      ],
    },
  ],
  customSections: [],
};
