"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Award,
  Users,
  Briefcase,
  Download,
  FileCheck2,
  Filter,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Send,
  CheckCircle2,
  Calendar,
  Mail,
  MessageSquare,
  Share2,
  UserCheck,
  LogIn,
  LogOut,
  RefreshCw,
  PlusCircle,
  GraduationCap,
  MapPin,
  Check,
  AlertCircle,
  ChevronDown,
  Globe
} from "lucide-react";
import {
  CAMPUS_NODES,
  CampusNode,
  CampusCandidate,
  INITIAL_MULTI_CAMPUS_CANDIDATES
} from "@/lib/campuses";

export default function TpoPage() {
  const [campuses, setCampuses] = useState<CampusNode[]>(CAMPUS_NODES);
  const [activeCampus, setActiveCampus] = useState<CampusNode | null>(null);
  const [candidates, setCandidates] = useState<CampusCandidate[]>(INITIAL_MULTI_CAMPUS_CANDIDATES);
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // Modals
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState<{ company: string; role: string; package: string; count: number } | null>(null);

  // Broadcast Form
  const [driveCompany, setDriveCompany] = useState("");
  const [driveRole, setDriveRole] = useState("");
  const [drivePackage, setDrivePackage] = useState("");
  const [minDri, setMinDri] = useState(80);

  // Custom Onboarding Form
  const [newCampusName, setNewCampusName] = useState("");
  const [newCampusShort, setNewCampusShort] = useState("");
  const [newCampusDomain, setNewCampusDomain] = useState("");
  const [newCampusLocation, setNewCampusLocation] = useState("");
  const [newCampusOfficer, setNewCampusOfficer] = useState("");
  const [newCampusEmail, setNewCampusEmail] = useState("");
  const [newCampusPhone, setNewCampusPhone] = useState("");
  const [newCampusDept, setNewCampusDept] = useState("Computer Science & Engineering");

  // Custom Login Form State
  const [customLoginEmail, setCustomLoginEmail] = useState("");
  const [customLoginKey, setCustomLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    // Read persisted campus or default to HIET Shahpur for smooth demonstration
    const savedCampusId = localStorage.getItem("vlink_tpo_active_campus");
    if (savedCampusId) {
      const match = campuses.find((c) => c.id === savedCampusId);
      if (match) {
        setActiveCampus(match);
      }
    }

    const savedStatuses = localStorage.getItem("vlink_candidate_statuses");
    if (savedStatuses) {
      try {
        setCandidateStatuses(JSON.parse(savedStatuses));
      } catch (e) {
        console.error("Failed to parse saved statuses", e);
      }
    } else {
      const initMap: Record<string, string> = {};
      INITIAL_MULTI_CAMPUS_CANDIDATES.forEach((c) => {
        initMap[c.id] = c.placementStatus || "ELIGIBLE";
      });
      setCandidateStatuses(initMap);
    }
    setLoading(false);
  }, [campuses]);

  const handleSelectCampus = (campus: CampusNode) => {
    setActiveCampus(campus);
    localStorage.setItem("vlink_tpo_active_campus", campus.id);
    setSwitchModalOpen(false);
    setDepartmentFilter("ALL");
  };

  const handleSignOut = () => {
    setActiveCampus(null);
    localStorage.removeItem("vlink_tpo_active_campus");
  };

  const handleStatusChange = (candidateId: string, newStatus: string) => {
    setCandidateStatuses((prev) => {
      const updated = { ...prev, [candidateId]: newStatus };
      localStorage.setItem("vlink_candidate_statuses", JSON.stringify(updated));
      return updated;
    });
  };

  const getEffectiveStatus = (c: CampusCandidate) => {
    return candidateStatuses[c.id] || c.placementStatus || "ELIGIBLE";
  };
  // Candidates scoped to active campus (or empty if unauthenticated)
  const campusCandidates = activeCampus
    ? candidates.filter((c) => c.campusId === activeCampus.id)
    : [];

  const filteredCandidates = campusCandidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some((sk) => sk.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTier =
      tierFilter === "ALL"
        ? true
        : tierFilter === "INDUSTRY"
        ? c.readinessScore >= 80
        : tierFilter === "JOB"
        ? c.readinessScore >= 65 && c.readinessScore < 80
        : c.readinessScore < 65;

    const currentStatus = getEffectiveStatus(c);
    const matchesStatus = statusFilter === "ALL" || currentStatus === statusFilter;
    const matchesDept = departmentFilter === "ALL" || c.department === departmentFilter;

    return matchesSearch && matchesTier && matchesStatus && matchesDept;
  });

  const avgScore = campusCandidates.length
    ? Math.round(campusCandidates.reduce((acc, s) => acc + (s.readinessScore || 0), 0) / campusCandidates.length)
    : 85;

  const industryReadyCount = campusCandidates.filter((s) => (s.readinessScore || 0) >= 80).length;
  const industryReadyPercent = campusCandidates.length
    ? Math.round((industryReadyCount / campusCandidates.length) * 100)
    : 100;

  const placedCount = campusCandidates.filter((s) => getEffectiveStatus(s) === "PLACED").length;
  const activePipelineCount = campusCandidates.filter((s) => {
    const st = getEffectiveStatus(s);
    return st === "SHORTLISTED" || st === "INTERVIEW_SCHEDULED" || st === "OFFER_EXTENDED";
  }).length;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const domain = customLoginEmail.split("@")[1]?.toLowerCase() || "";
    const match = campuses.find((c) => c.domain.toLowerCase() === domain);

    if (match) {
      handleSelectCampus(match);
      setCustomLoginEmail("");
      setCustomLoginKey("");
    } else {
      // Create ad-hoc campus node if domain not found
      const newId = `campus-${domain.replace(/[^a-z0-9]/g, "") || Date.now()}`;
      const fallbackCampus: CampusNode = {
        id: newId,
        name: `${domain.toUpperCase()} Campus Node`,
        shortName: domain.toUpperCase(),
        domain: domain || "university.edu",
        location: "University Campus",
        accreditation: "Institutional Member",
        nbaStatus: "Accredited",
        tpoOfficerName: customLoginEmail.split("@")[0].toUpperCase() || "Placement Director",
        tpoOfficerTitle: "Head of Training & Placement",
        tpoEmail: customLoginEmail,
        tpoPhone: "+91 98000 00000",
        accentColor: "#4F46E5",
        badgeText: "VERIFIED INSTITUTIONAL NODE",
        departments: [
          {
            name: "Computer Science & Engineering",
            batch: "2023–2027",
            avgDri: 84.0,
            coreCompetencies: "Full-Stack, Cloud, Data Structures",
            auditStatus: "Verified Compliant",
          },
        ],
      };
      setCampuses((prev) => [...prev, fallbackCampus]);
      handleSelectCampus(fallbackCampus);
    }
  };

  const handleOnboardNewCampus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusName || !newCampusDomain) return;

    const newId = `campus-${newCampusDomain.replace(/[^a-z0-9]/g, "") || Date.now()}`;
    const newCampus: CampusNode = {
      id: newId,
      name: newCampusName,
      shortName: newCampusShort || newCampusName,
      domain: newCampusDomain,
      location: newCampusLocation || "University Campus",
      accreditation: "Commercial Onboarded Partner",
      nbaStatus: "NBA Tier-1 / ABET Compliant",
      tpoOfficerName: newCampusOfficer || "Placement Officer",
      tpoOfficerTitle: "Director of Career Services",
      tpoEmail: newCampusEmail || `tpo@${newCampusDomain}`,
      tpoPhone: newCampusPhone || "+91 98000 11223",
      accentColor: "#6366F1",
      badgeText: "ENTERPRISE AFFILIATE NODE",
      departments: [
        {
          name: newCampusDept,
          batch: "2023–2027",
          avgDri: 85.0,
          coreCompetencies: "Software Engineering, Cloud, AI",
          auditStatus: "Verified Compliant",
        },
      ],
    };

    // Add 2 demo verified students for this newly registered campus
    const demoCandidates: CampusCandidate[] = [
      {
        id: `user-${newId}-1`,
        campusId: newId,
        name: `Lead Scholar (${newCampus.shortName})`,
        email: `student1@${newCampusDomain}`,
        phone: "+91 98000 88771",
        campus: newCampus.name,
        department: newCampusDept,
        graduationYear: "2027",
        headline: "Software & Cloud Engineer | React, TypeScript, Python",
        targetRole: "Software Development Engineer",
        verifiedCampusBadge: true,
        avatarColor: "#6366F1",
        readinessScore: 86,
        readinessTier: "Industry Ready",
        skills: [
          { name: "TypeScript", level: 88, verified: true, endorsements: 2 },
          { name: "Python", level: 85, verified: true, endorsements: 2 },
          { name: "React", level: 86, verified: true, endorsements: 2 },
        ],
        placementStatus: "SHORTLISTED",
      },
    ];

    setCampuses((prev) => [...prev, newCampus]);
    setCandidates((prev) => [...prev, ...demoCandidates]);
    setActiveCampus(newCampus);
    localStorage.setItem("vlink_tpo_active_campus", newCampus.id);
    setOnboardModalOpen(false);
  };
  function handleExportCsv() {
    if (!activeCampus) return;
    const headers = [
      "Candidate ID",
      "Name",
      "Institutional Email",
      "Phone",
      "Campus Node",
      "Department",
      "Graduation Year",
      "Target Role",
      "Readiness Score (DRI)",
      "Readiness Tier",
      "Placement Status",
      "Verified Badge",
    ];
    const rows = filteredCandidates.map((c) => [
      c.id,
      `"${c.name}"`,
      c.email,
      c.phone,
      `"${c.campus}"`,
      `"${c.department}"`,
      c.graduationYear,
      `"${c.targetRole}"`,
      c.readinessScore,
      `"${c.readinessTier}"`,
      `"${getEffectiveStatus(c)}"`,
      c.verifiedCampusBadge ? "VERIFIED" : "UNVERIFIED",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `VLink_${activeCampus.shortName.replace(/\s+/g, "_")}_Placement_Accreditation_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 1-Click WhatsApp Candidate Alert (Personalized by Active Campus TPO)
  const getCandidateWhatsAppUrl = (c: CampusCandidate) => {
    const campusName = activeCampus?.name || c.campus;
    const officer = activeCampus?.tpoOfficerName || "TPO Office";
    const status = getEffectiveStatus(c);
    const text = `🎓 *V-LINK ${campusName.toUpperCase()} PLACEMENT UPDATE*\n\nHello *${c.name}*,\n\nThis is ${officer} from the Training & Placement Cell (${campusName}).\n\n• *Target Role:* ${c.targetRole}\n• *Verified DRI Score:* ${c.readinessScore}% (${c.readinessTier})\n• *Current Hiring Status:* ${status.replace('_', ' ')}\n• *Department:* ${c.department}\n\nPlease check your V-LINK portal to review shortlisted corporate interview slots and verified ATS resume:\nhttps://vlink.careers/resume\n\n_Training & Placement Office · ${campusName}_`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  // 1-Click Gmail Candidate Compose (Personalized by Active Campus TPO)
  const getCandidateGmailUrl = (c: CampusCandidate) => {
    const campusName = activeCampus?.name || c.campus;
    const officer = activeCampus?.tpoOfficerName || "Placement Director";
    const status = getEffectiveStatus(c);
    const subject = `[${activeCampus?.shortName || 'V-LINK'} Placement Cell] Official Drive Status & Scheduling for ${c.name}`;
    const body = `Dear ${c.name},

Greetings from the Training & Placement Cell, ${campusName}.

Your profile has been evaluated for upcoming corporate campus drives based on your verified technical radar score.

Candidate Summary:
- Full Name: ${c.name}
- Institutional Email: ${c.email}
- Department: ${c.department} (Class of ${c.graduationYear})
- Primary Role Target: ${c.targetRole}
- Dynamic Readiness Index (DRI): ${c.readinessScore}% [${c.readinessTier}]
- Current Drive Status: ${status.replace('_', ' ')}

Next Steps:
1. Ensure your ATS-formatted Resume is updated on the V-LINK Career OS: https://vlink.careers/resume
2. Check the Job Board for upcoming drives matched to your skill profile: https://vlink.careers/jobs
3. Confirm your participation for the upcoming technical round briefings with the TPO office.

Warm regards,
${officer}
${activeCampus?.tpoOfficerTitle || 'Head of Placements'}
${campusName} · V-LINK Talent Network`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Cohort Batch WhatsApp Broadcast Link
  const getCohortWhatsAppBroadcastUrl = () => {
    const campusName = activeCampus?.name || "Campus";
    const text = `📢 *${campusName.toUpperCase()} · CAMPUS HIRING DRIVE BROADCAST*\n\n*Hiring Partner:* ${driveCompany || 'Partner Enterprise'}\n*Role Title:* ${driveRole || 'Software Development Engineer'}\n*Compensation:* ${drivePackage || 'Industry Best standard'}\n*Eligibility:* Minimum DRI Score ${minDri}%\n*Eligible Cohort:* ${filteredCandidates.length} Candidates\n\nAll verified candidates from ${campusName} meeting criteria are invited to register immediately:\nhttps://vlink.careers/jobs\n\n_Training & Placement Cell · ${campusName}_`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  // Cohort Batch Gmail BCC Compose Link
  const getCohortGmailBroadcastUrl = () => {
    const campusName = activeCampus?.name || "Campus";
    const emails = filteredCandidates.map((c) => c.email).filter(Boolean);
    const bccList = emails.join(",");
    const subject = `[${activeCampus?.shortName || 'Campus'} Drive Announcement] ${driveCompany || 'Enterprise Partner'} - ${driveRole || 'Engineering Opening'}`;
    const body = `Dear ${activeCampus?.shortName || 'University'} Candidates,

The Training & Placement Cell is pleased to announce a new campus hiring opportunity through the V-LINK Enterprise Network.

DRIVE DETAILS:
• Hiring Partner: ${driveCompany || 'Enterprise Partner'}
• Role Title: ${driveRole || 'Software Engineering Role'}
• Compensation / CTC: ${drivePackage || 'Commensurate with DRI tier'}
• Minimum DRI Benchmark: ${minDri}%

ELIGIBLE APPLICANTS:
You are receiving this official announcement because your verified academic domain profile meets the eligibility threshold.

ACTION REQUIRED:
1. Review the opportunity on the V-LINK Job Board: https://vlink.careers/jobs
2. Confirm your registration with the placement cell before 6:00 PM tomorrow.

Best of luck!

${activeCampus?.tpoOfficerName || 'Training & Placement Cell'}
${campusName} · V-LINK Talent OS`;

    return `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!driveCompany || !driveRole) return;
    const count = filteredCandidates.filter((c) => c.readinessScore >= minDri).length;
    setLastBroadcast({
      company: driveCompany,
      role: driveRole,
      package: drivePackage,
      count: count || filteredCandidates.length,
    });
    setBroadcastSuccess(true);
  }
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════════
          MODE A: UN-AUTHENTICATED / INSTITUTIONAL TPO GATEWAY
         ═══════════════════════════════════════════════════════════════ */}
      {!activeCampus ? (
        <div className="space-y-8">
          {/* Gateway Commercial Hero */}
          <div className="sense-card p-6 sm:p-10 bg-gradient-to-br from-white/95 via-white/85 to-indigo-50/50 border border-white/90 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#4F46E5]/10 blur-3xl pointer-events-none" />
            <div className="absolute right-32 bottom-0 h-64 w-64 rounded-full bg-[#00C48C]/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20">
                <Building2 className="h-3.5 w-3.5" />
                <span>COMMERCIAL UNIVERSITY & TPO NETWORK</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Institutional Campus Placement Command
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                Connect your university placement cell with verified AI readiness diagnostics, real-time NAAC/NBA accreditation telemetry, and instant WhatsApp & Gmail candidate dispatch.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(true)}
                  className="btn-dibs-primary text-xs flex items-center gap-2 shadow-md"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Onboard New University / Campus Node</span>
                </button>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 pl-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Multi-Tenant Domain Isolation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Campuses Directory */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#4F46E5]" />
                  <span>Select Your Verified Institutional Node</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select your campus placement office to access verified candidate rosters, accreditation analytics, and dispatch tools.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {campuses.length} Partner Campuses Registered
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {campuses.map((campus) => {
                const count = candidates.filter((c) => c.campusId === campus.id).length;
                return (
                  <div
                    key={campus.id}
                    className="card-dibs p-6 bg-white/90 border border-slate-200/90 hover:border-[#4F46E5]/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group space-y-4 relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: campus.accentColor }}
                    />

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {campus.badgeText}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Users className="h-3 w-3" />
                          <span>{count} Verified</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-[#4F46E5] transition">
                          {campus.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{campus.location}</span>
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs space-y-1">
                        <div className="text-slate-700 font-semibold flex items-center justify-between">
                          <span>{campus.tpoOfficerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">@{campus.domain}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{campus.tpoOfficerTitle}</div>
                        <div className="text-[10px] text-emerald-700 font-medium pt-1 border-t border-slate-200/60 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          <span>{campus.accreditation}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCampus(campus)}
                      className="w-full btn-dibs-primary text-xs flex items-center justify-center gap-2 group-hover:shadow-md transition"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Launch {campus.shortName} Portal</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Institutional Domain Access Form */}
          <div className="card-dibs p-6 sm:p-8 bg-slate-50/90 border border-slate-200/80 max-w-xl mx-auto space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Globe className="h-5 w-5 text-[#4F46E5]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sign In with Campus Email</h3>
                <p className="text-[11px] text-slate-500">
                  Enter your official university email (e.g. tpo@hiet.co.in or placement@iitd.ac.in).
                </p>
              </div>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Institutional Email</label>
                <input
                  type="email"
                  required
                  value={customLoginEmail}
                  onChange={(e) => setCustomLoginEmail(e.target.value)}
                  placeholder="e.g. placement@university.ac.in"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Access PIN / Master Key</label>
                <input
                  type="password"
                  value={customLoginKey}
                  onChange={(e) => setCustomLoginKey(e.target.value)}
                  placeholder="Enter Campus PIN (Optional Demo Key)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full btn-dibs-primary text-xs flex items-center justify-center gap-2">
                <LogIn className="h-3.5 w-3.5" />
                <span>Authenticate & Open TPO Hub</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           MODE B: AUTHENTICATED ACTIVE CAMPUS COMMAND HUB
           ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-8 animate-in fade-in">
          {/* Active Campus Command Header */}
          <div className="sense-card p-6 sm:p-8 bg-gradient-to-br from-white/95 via-white/85 to-indigo-50/40 border border-white/90 shadow-xl backdrop-blur-2xl relative overflow-hidden">
            <div
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: activeCampus.accentColor }}
            />
            <div className="absolute right-32 bottom-0 h-48 w-48 rounded-full bg-[#00C48C]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-xs"
                    style={{ backgroundColor: activeCampus.accentColor }}
                  >
                    {activeCampus.badgeText}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">·</span>
                  <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#00C48C]" />
                    <span>{activeCampus.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp & Gmail Connected
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {activeCampus.name}
                </h1>

                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  <span className="font-semibold text-slate-800">
                    Officer: {activeCampus.tpoOfficerName}
                  </span>
                  <span>·</span>
                  <span className="font-mono text-slate-500">{activeCampus.tpoEmail}</span>
                  <span>·</span>
                  <span className="text-emerald-700 font-medium">{activeCampus.accreditation}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSwitchModalOpen(true)}
                  className="btn-dibs-secondary text-xs flex items-center gap-1.5 shadow-sm"
                  title="Switch to another university campus"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                  <span>Switch Campus</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="btn-dibs-secondary text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-slate-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastSuccess(false);
                    setBroadcastModalOpen(true);
                  }}
                  className="btn-dibs-primary text-xs flex items-center gap-2 shadow-md"
                >
                  <Send className="h-3.5 w-3.5 text-white" />
                  <span>Broadcast Drive</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1"
                  title="Exit Campus Command Hub"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Institutional KPI Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-dibs p-5 bg-slate-100/60 border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                <span>CAMPUS COHORT</span>
                <Users className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {campusCandidates.length} <span className="text-xs font-normal text-slate-500">Candidates</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>@{activeCampus.domain} Domain Authenticated</span>
              </div>
            </div>

            <div className="card-dibs p-5 bg-slate-100/60 border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                <span>AVERAGE READINESS (DRI)</span>
                <Award className="h-4 w-4 text-[#4F46E5]" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {avgScore}%
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                <span className="h-2 w-2 rounded-full bg-[#00C48C]" />
                <span>Industry Ready Benchmark</span>
              </div>
            </div>

            <div className="card-dibs p-5 bg-slate-100/60 border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                <span>PIPELINE ACTIVITY</span>
                <Briefcase className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
                <span>{activePipelineCount}</span>
                <span className="text-xs font-normal text-slate-500">In Pipeline ({placedCount} Placed)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="text-indigo-600 font-bold">{activePipelineCount} Active</span>
                <span>·</span>
                <span className="text-emerald-600 font-bold">{placedCount} Placed 🎉</span>
              </div>
            </div>

            <div className="card-dibs p-5 bg-slate-100/60 border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
                <span>ACCREDITATION AUDIT</span>
                <FileCheck2 className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-lg font-black text-slate-900 flex items-center gap-2 pt-1">
                <span className="badge-mint py-1 px-2.5 text-xs">{activeCampus.nbaStatus}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Real-time NAAC Criterion 5.2 sync
              </div>
            </div>
          </div>
          {/* Cohort Distribution & Department Competency Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier Distribution Gauge */}
            <div className="card-dibs p-6 bg-slate-100/70 border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#4F46E5]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Readiness Tier Split</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{activeCampus.shortName}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-600">Industry Ready (80% - 100%)</span>
                    <span className="text-slate-900 font-mono">{industryReadyPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#00C48C] rounded-full transition-all duration-500"
                      style={{ width: `${industryReadyPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Students with verified code repositories, radar scores 80+, and peer endorsements.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600">Job Ready (65% - 79%)</span>
                    <span className="text-slate-900 font-mono">{100 - industryReadyPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${100 - industryReadyPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Intermediate diagnostic completion; actively progressing on role roadmap.
                  </p>
                </div>
              </div>
            </div>

            {/* Campus Department Competency Matrix */}
            <div className="card-dibs p-6 bg-slate-100/70 border border-slate-200/80 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {activeCampus.shortName} Faculty Competency Matrix
                  </h3>
                </div>
                <span className="text-xs text-slate-500">{activeCampus.accreditation}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500 font-mono text-[11px]">
                      <th className="pb-2.5">Department</th>
                      <th className="pb-2.5">Batch</th>
                      <th className="pb-2.5">Avg DRI</th>
                      <th className="pb-2.5">Core Competencies</th>
                      <th className="pb-2.5 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {activeCampus.departments.map((dept) => (
                      <tr key={dept.name}>
                        <td className="py-3 font-semibold text-slate-900">{dept.name}</td>
                        <td className="py-3 text-slate-600 font-mono">{dept.batch}</td>
                        <td className="py-3 font-mono font-bold text-emerald-600">{dept.avgDri}%</td>
                        <td className="py-3 text-slate-600">{dept.coreCompetencies}</td>
                        <td className="py-3 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            dept.auditStatus === "Verified Compliant" ? "badge-mint" : "badge-coral"
                          }`}>
                            {dept.auditStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Student Placement Roster & Command Bar */}
          <div className="card-dibs p-6 bg-slate-50/90 border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>{activeCampus.shortName} Verified Candidate Talent Pool</span>
                  <span className="badge-coral text-[10px]">{filteredCandidates.length} Candidates</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage candidate status, dispatch 1-click WhatsApp alerts, or compose direct Gmail interviews.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search Input */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter name, skill, role..."
                    className="rounded-full border border-slate-200/90 bg-white pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-[#4F46E5] focus:outline-none font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ELIGIBLE">Eligible</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                  <option value="OFFER_EXTENDED">Offer Extended</option>
                  <option value="PLACED">Placed 🎉</option>
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-[#4F46E5] focus:outline-none font-medium"
                >
                  <option value="ALL">All Departments</option>
                  {activeCampus.departments.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>

                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-[#4F46E5] focus:outline-none"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="INDUSTRY">Industry Ready (80%+)</option>
                  <option value="JOB">Job Ready (65-79%)</option>
                  <option value="EMERGING">Emerging (&lt;65%)</option>
                </select>
              </div>
            </div>

            {/* Quick Batch Messaging Bar */}
            {filteredCandidates.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-indigo-50 to-orange-50 border border-slate-200/80 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">{activeCampus.shortName} Multi-Channel Dispatch:</span>
                  <span className="text-slate-600">{filteredCandidates.length} verified candidates in view</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getCohortWhatsAppBroadcastUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp Cohort Broadcast
                  </a>
                  <a
                    href={getCohortGmailBroadcastUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#4F46E5] text-white hover:bg-[#e04825] shadow-sm transition"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Compose Gmail (BCC Cohort)
                  </a>
                </div>
              </div>
            )}
            {/* Candidate Cards Grid */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading verified campus telemetry...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No students match your filter criteria for {activeCampus.shortName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCandidates.map((c) => {
                  const currentStatus = getEffectiveStatus(c);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-white text-base shadow-md"
                            style={{ backgroundColor: c.avatarColor || activeCampus.accentColor }}
                          >
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-slate-900 hover:text-cyan-600 transition">
                                {c.name}
                              </h4>
                              {c.verifiedCampusBadge && (
                                <span title={`${activeCampus.shortName} Verified Academic Badge`} className="text-cyan-600">
                                  <ShieldCheck className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 font-semibold">{c.targetRole}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{c.email}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-slate-900 font-mono">
                            {c.readinessScore}%
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold uppercase rounded-full px-2 py-0.5 mt-0.5 ${
                              c.readinessScore >= 80 ? "badge-mint" : "badge-coral"
                            }`}
                          >
                            {c.readinessTier}
                          </span>
                        </div>
                      </div>

                      {/* Skills tags */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {c.skills.slice(0, 4).map((sk) => (
                          <span
                            key={sk.name}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 font-mono font-medium"
                          >
                            {sk.name} · {sk.level}%
                          </span>
                        ))}
                        {c.skills.length > 4 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            +{c.skills.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Placement Lifecycle Status Selector */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Hiring Status:</span>
                        </span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition focus:outline-none ${
                            currentStatus === "PLACED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : currentStatus === "OFFER_EXTENDED"
                              ? "bg-teal-50 text-teal-800 border-teal-300"
                              : currentStatus === "INTERVIEW_SCHEDULED"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                              : currentStatus === "SHORTLISTED"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <option value="ELIGIBLE">Eligible</option>
                          <option value="SHORTLISTED">Shortlisted</option>
                          <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                          <option value="OFFER_EXTENDED">Offer Extended</option>
                          <option value="PLACED">Placed 🎉</option>
                        </select>
                      </div>

                      {/* 1-Click WhatsApp & Gmail Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={getCandidateWhatsAppUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                          title="Direct message candidate on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp Alert</span>
                        </a>
                        <a
                          href={getCandidateGmailUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-50 border border-orange-200 text-[#4F46E5] hover:bg-orange-100 transition shadow-xs"
                          title="Compose interview / drive letter via Gmail"
                        >
                          <Mail className="h-3.5 w-3.5 text-[#4F46E5]" />
                          <span>Send Gmail</span>
                        </a>
                      </div>

                      {/* Foot navigation */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                        <span className="text-[11px]">{c.department} · {c.graduationYear}</span>
                        <div className="flex items-center gap-3">
                          <Link
                            href="/profile"
                            className="hover:text-cyan-600 font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            Profile <ChevronRight className="h-3 w-3" />
                          </Link>
                          <Link
                            href="/resume"
                            className="hover:text-[#4F46E5] font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            ATS Resume <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ─── Modal 1: Campus Drive Broadcast Modal ─────────────────── */}
      {broadcastModalOpen && activeCampus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="p-6 sm:p-8 w-full max-w-lg bg-white/95 border border-white/90 rounded-3xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 backdrop-blur-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-[#4F46E5]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Broadcast {activeCampus.shortName} Campus Drive
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2.5 py-1 rounded-full bg-slate-100"
              >
                ✕
              </button>
            </div>

            {broadcastSuccess ? (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">Drive Broadcast Configured!</h4>
                  <p className="text-xs text-slate-600">
                    Targeting <b>{lastBroadcast?.count}</b> verified candidates at <b>{activeCampus.name}</b> for <b>{lastBroadcast?.company}</b> ({lastBroadcast?.role}).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Instant Multi-Channel Dispatch:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={getCohortWhatsAppBroadcastUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Open WhatsApp Broadcast
                    </a>
                    <a
                      href={getCohortGmailBroadcastUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#4F46E5] text-white font-bold text-xs hover:bg-[#e04825] shadow-sm transition"
                    >
                      <Mail className="h-4 w-4" />
                      Compose Gmail to Cohort
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastSuccess(false);
                      setBroadcastModalOpen(false);
                      setDriveCompany("");
                      setDriveRole("");
                      setDrivePackage("");
                    }}
                    className="btn-dibs-secondary text-xs w-full"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBroadcast} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={driveCompany}
                    onChange={(e) => setDriveCompany(e.target.value)}
                    placeholder="e.g. Google Cloud, Microsoft, Infosys, Zscaler"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role Title</label>
                  <input
                    type="text"
                    required
                    value={driveRole}
                    onChange={(e) => setDriveRole(e.target.value)}
                    placeholder="e.g. Associate Software Engineer, Cloud Trainee"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Compensation / CTC</label>
                    <input
                      type="text"
                      value={drivePackage}
                      onChange={(e) => setDrivePackage(e.target.value)}
                      placeholder="e.g. ₹8.5 LPA - ₹18 LPA"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Minimum DRI Score</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minDri}
                      onChange={(e) => setMinDri(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-[#4F46E5] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 text-[11px] text-slate-700 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[#4F46E5] shrink-0 mt-0.5" />
                  <span>
                    Submitting will prepare 1-click <b>WhatsApp Announcement</b> and <b>Gmail Cohort Compose (BCC)</b> with all candidate details pre-filled for {activeCampus.shortName}.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastModalOpen(false)}
                    className="btn-dibs-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-dibs-primary text-xs flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-white" />
                    Launch Drive Multi-Channel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal 2: Switch Campus Modal ───────────────────────────── */}
      {switchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="p-6 sm:p-8 w-full max-w-2xl bg-white/95 border border-white/90 rounded-3xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-[#4F46E5]" />
                <h3 className="text-base font-extrabold text-slate-900">Switch Institutional Campus Node</h3>
              </div>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2.5 py-1 rounded-full bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select an institutional campus to manage its verified student cohort, accreditation metrics, and communication channels:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {campuses.map((c) => {
                const count = candidates.filter((cand) => cand.campusId === c.id).length;
                const isSelected = activeCampus?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCampus(c)}
                    className={`text-left p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                      isSelected
                        ? "border-[#4F46E5] bg-orange-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.shortName}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[#4F46E5] flex items-center gap-1">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 line-clamp-1">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.tpoOfficerName} · {count} verified</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSwitchModalOpen(false);
                  setOnboardModalOpen(true);
                }}
                className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ Register New Campus</span>
              </button>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="btn-dibs-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Onboard New University / Campus Modal ─────────── */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="p-6 sm:p-8 w-full max-w-lg bg-white/95 border border-white/90 rounded-3xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-[#4F46E5]" />
                <h3 className="text-base font-extrabold text-slate-900">Onboard University / Campus Node</h3>
              </div>
              <button
                type="button"
                onClick={() => setOnboardModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2.5 py-1 rounded-full bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardNewCampus} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">University / Campus Full Name</label>
                <input
                  type="text"
                  required
                  value={newCampusName}
                  onChange={(e) => setNewCampusName(e.target.value)}
                  placeholder="e.g. Manipal University Jaipur (MUJ)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    value={newCampusShort}
                    onChange={(e) => setNewCampusShort(e.target.value)}
                    placeholder="e.g. MUJ Jaipur"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Academic Email Domain</label>
                  <input
                    type="text"
                    required
                    value={newCampusDomain}
                    onChange={(e) => setNewCampusDomain(e.target.value)}
                    placeholder="e.g. jaipur.manipal.edu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Campus Location</label>
                <input
                  type="text"
                  value={newCampusLocation}
                  onChange={(e) => setNewCampusLocation(e.target.value)}
                  placeholder="e.g. Jaipur, Rajasthan"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">TPO Officer Name</label>
                  <input
                    type="text"
                    value={newCampusOfficer}
                    onChange={(e) => setNewCampusOfficer(e.target.value)}
                    placeholder="e.g. Dr. Anil Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official TPO Email</label>
                  <input
                    type="email"
                    value={newCampusEmail}
                    onChange={(e) => setNewCampusEmail(e.target.value)}
                    placeholder="e.g. placements@muj.manipal.edu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Primary Department</label>
                <input
                  type="text"
                  value={newCampusDept}
                  onChange={(e) => setNewCampusDept(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="btn-dibs-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-dibs-primary text-xs flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Register & Activate Campus Node</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
