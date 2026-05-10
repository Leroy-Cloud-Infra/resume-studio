import type { Resume } from "@/types/resume";

export const sampleResume: Resume = {
  title: "IT Support Technician Resume",
  header: {
    name: "Cesar Hernandez Lopez",
    email: "cesarhernandezl@proton.me",
    phone: "(503) 544-6881",
    location: "Beaverton, Oregon",
    links: [],
  },
  summary:
    "IT support technician with 5+ years of experience supporting small business clients and building self-hosted systems using Linux and Docker. Experience with networking, service deployment, and troubleshooting across personal and client environments. Familiar with automation, CI/CD workflows, and infrastructure, including local LLM integration.",
  skills: [
    {
      category: "Systems",
      items: [
        "Linux (Ubuntu)",
        "macOS",
        "Windows 10/11",
        "Windows Server",
        "Proxmox",
        "Hyper-V",
      ],
    },
    {
      category: "Development & Tools",
      items: [
        "Docker",
        "Git",
        "CI/CD (GitHub Actions)",
        "Bash (basic)",
        "Python (basic)",
        "PowerShell (basic)",
      ],
    },
    {
      category: "Infrastructure & Networking",
      items: ["TCP/IP", "DNS", "DHCP", "VPN", "SSH", "Tailscale", "Traefik"],
    },
    {
      category: "Platforms & Administration",
      items: [
        "Microsoft 365",
        "Google Workspace",
        "Active Directory",
        "Group Policy",
        "Monitoring tools",
      ],
    },
    {
      category: "AI & Data",
      items: ["Local LLM integration", "Prompt workflows", "Structured logs"],
    },
  ],
  experience: [
    {
      company: "INDEPENDENT",
      title: "IT Support Technician",
      location: "Beaverton, OR",
      dates: "Jun 2022 — Present",
      bullets: [
        "Built and maintained self-hosted Linux infrastructure using Docker to run and manage containerized services across personal and client environments.",
        "Configured networking, reverse proxy routing with Traefik, and secure remote access through Tailscale to support communication between services.",
        "Designed and deployed a centralized LLM engine controller to manage service status, Wake-on-LAN requests, and API routing across multiple applications.",
        "Built and used CI/CD workflows with GitHub Actions to automate application build, validation, deployment, and service verification.",
        "Diagnosed and resolved system issues using container logs, service health checks, and network-level troubleshooting.",
        "Deployed monitoring tools to track service health, uptime, and system performance across environments.",
        "Built a Proxmox-based virtualization environment with Windows VMs and snapshot-based testing to reproduce issues and validate fixes.",
        "Deployed and administered Windows Server environments including Active Directory, DNS, and domain-joined systems.",
        "Deployed ticketing systems with SLA workflows and built a helpdesk simulation environment using a local LLM to practice structured troubleshooting.",
        "Delivered 1,000+ hours of technical support to 20+ small business clients across Windows, macOS, and Linux environments.",
      ],
    },
    {
      company: "APPLE INC.",
      title: "Specialist",
      location: "Portland, OR",
      dates: "Aug 2021 — Feb 2025",
      bullets: [
        "Supported 30+ customers daily including individuals and small businesses with device setup, troubleshooting, and workflow optimization in a high-volume environment.",
        "Guided users through account configuration, data migration, and troubleshooting, maintaining customer satisfaction scores in the top 10% of store benchmarks.",
      ],
    },
    {
      company: "XEROX",
      title: "AppleCare Advisor",
      location: "Tigard, OR",
      dates: "Jul 2016 — Jun 2017",
      bullets: [
        "Provided Tier 1 remote technical support via phone and chat, following defined troubleshooting procedures, documenting outcomes, and escalating issues with clear notes and context.",
      ],
    },
  ],
  projects: [],
  education: [
    {
      school: "Western Governors University",
      degree: "B.S. in Computer Science",
      dates: "Sept 2023 — Nov 2026",
      location: "Remote",
      coursework: [
        "Data Structures and Algorithms",
        "Computer Architecture",
        "Software Engineering",
      ],
    },
  ],
};
