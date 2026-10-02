"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import NavIcon from "../components/NavIcon";
import ExpenseIcon from "../components/ExpenseIcon";
import AccountPanel from "../components/AccountPanel";
import { UpdateBadge, UpdateToast, UpdatesFeed } from "../components/UpdateNotifications";
import { useUpdateNotifications } from "../lib/useUpdateNotifications";
import { destinationInfo, findDestinationPhotos } from "../lib/destinations";
import { useWayfareAccount } from "../lib/useWayfareAccount";
import { inferExpense } from "../lib/expenseAppearance.mjs";

// Presentational-only icon pick for a trip or expense group, based on its
// name — separate from inferExpense's DB-category inference so it can use
// a wider, icon-only vocabulary without touching real expense categories.
function autoTripIcon(name = "") {
  const text = name.toLowerCase();
  if (/\b(ski|skiing|snow|snowboard)\b/.test(text)) return "ski";
  if (/\b(mountain|hike|hiking|alps|trek)\b/.test(text)) return "mountain";
  if (/\b(beach|coast|island|seaside)\b/.test(text)) return "beach";
  if (/\b(camp|camping)\b/.test(text)) return "camp";
  if (/\b(cruise|boat|sail|sailing)\b/.test(text)) return "boat";
  const inferred = inferExpense(name);
  return inferred.icon === "tag" ? "plane" : inferred.icon;
}
function autoGroupIcon(name = "") {
  const inferred = inferExpense(name);
  return inferred.icon === "tag" ? "group" : inferred.icon;
}

const NAV_ITEMS = [
  { id: "plans", icon: "plans", label: "Plans" },
  { id: "settle", icon: "settle", label: "Settle up" },
  { id: "updates", icon: "updates", label: "Updates" },
  { id: "profile", icon: "profile", label: "Profile" },
];

const EXPENSE_GROUP_PREFIX = "WAYFARE_GROUP::";
const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "AED", "CHF", "CAD", "AUD", "JPY", "EGP", "TRY", "SAR"];
const CURRENCY_SYMBOLS = { EUR: "€", USD: "$", GBP: "£", AED: "AED ", CHF: "CHF ", CAD: "CA$", AUD: "A$", JPY: "¥", EGP: "E£", TRY: "₺", SAR: "SAR " };
const AVATAR_OPTIONS = ["🧭", "😎", "🌴", "⛰️", "🌊", "🏕️", "🛫", "📸"];

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}
function moneyIn(value, code) {
  return `${CURRENCY_SYMBOLS[code] || `${code} `}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isExpenseGroup(trip) {
  return String(trip?.name || "").startsWith(EXPENSE_GROUP_PREFIX);
}

function displayTripName(trip) {
  return String(trip?.name || "").replace(EXPENSE_GROUP_PREFIX, "");
}

function AvatarPreview({ name, avatar, className = "profile-bubble" }) {
  if (avatar?.startsWith("data:image") || avatar?.startsWith("https://")) return <div className={`${className} has-photo`}><img src={avatar} alt="" /></div>;
  return <div className={className}>{avatar || (name || "Y").slice(0, 1).toUpperCase()}</div>;
}

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const size = 220;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function DestinationCover({ name }) {
  const [photos, setPhotos] = useState(destinationInfo(name).photos.slice(0, 3));

  useEffect(() => {
    const controller = new AbortController();
    setPhotos(destinationInfo(name).photos.slice(0, 3));
    findDestinationPhotos(name, { size: 1000, limit: 3, signal: controller.signal })
      .then((found) => found.length && setPhotos(found))
      .catch(() => {});
    return () => controller.abort();
  }, [name]);

  return <div className="trip-card-cover destination-cover-collage"><img className="cover-photo cover-photo-1" src={photos[0]} alt="" loading="lazy" /></div>;
}

function dateFromInput(value) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function endDateForDuration(startDate, duration) {
  const date = dateFromInput(startDate);
  if (!date) return "";
  date.setDate(date.getDate() + Math.max(1, Number(duration) || 1) - 1);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(startDate, endDate) {
  const start = dateFromInput(startDate);
  const end = dateFromInput(endDate);
  if (!start || !end || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

function tripDateLabel(trip) {
  if (!trip?.start_date) return `${trip?.duration_days || 3} DAYS`;
  const start = dateFromInput(trip.start_date);
  const end = dateFromInput(trip.end_date || trip.start_date);
  const startText = start.toLocaleDateString([], { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${startText} – ${endText} · ${trip?.duration_days || inclusiveDays(trip.start_date, trip.end_date) || 1} DAYS`;
}

export default function Home() {
  const router = useRouter();
  const account = useWayfareAccount();
  const [tripName, setTripName] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [tripSearch, setTripSearch] = useState("");
  const createRef = useRef(null);
  function openCreate() {
    setCreateOpen(true);
    requestAnimationFrame(() => createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function openGroupForm() {
    setGroupFormOpen(true);
    requestAnimationFrame(() => groupFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function handleHeaderAdd() {
    if (activeView === "settle") openGroupForm();
    else openCreate();
  }
  const [activeView, setActiveView] = useState("plans");
  const notifications = useUpdateNotifications(account.user?.id, activeView === "updates");
  const [trips, setTrips] = useState([]);
  const [tripsReady, setTripsReady] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupCurrency, setGroupCurrency] = useState("EUR");
  const [groupCreating, setGroupCreating] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [settleError, setSettleError] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileHome, setProfileHome] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileCurrency, setProfileCurrency] = useState("EUR");
  const [deletePlanTarget, setDeletePlanTarget] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const groupFormRef = useRef(null);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendBalances, setFriendBalances] = useState({});
  const [friendBalancesLoading, setFriendBalancesLoading] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendError, setFriendError] = useState("");
  const [friendSending, setFriendSending] = useState(false);
  const [friendActionId, setFriendActionId] = useState(null);

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (NAV_ITEMS.some((item) => item.id === requestedView)) setActiveView(requestedView);
    const savedProfile = localStorage.getItem("wayfare_profile_name") || "";
    const savedAvatar = localStorage.getItem("wayfare_profile_avatar") || "";
    const savedHome = localStorage.getItem("wayfare_profile_home") || "";
    const savedBio = localStorage.getItem("wayfare_profile_bio") || "";
    const savedCurrency = localStorage.getItem("wayfare_profile_currency") || "EUR";
    setYourName(savedProfile);
    setProfileAvatar(savedAvatar);
    setProfileHome(savedHome);
    setProfileBio(savedBio);
    setProfileCurrency(CURRENCY_OPTIONS.includes(savedCurrency) ? savedCurrency : "EUR");
    setGroupCurrency(CURRENCY_OPTIONS.includes(savedCurrency) ? savedCurrency : "EUR");
  }, []);

  useEffect(() => {
    if (!account.profile) return;
    const cloud = account.profile;
    const nextName = cloud.display_name || "";
    const nextAvatar = cloud.avatar || "";
    const nextHome = cloud.home_city || "";
    const nextBio = cloud.bio || "";
    const nextCurrency = CURRENCY_OPTIONS.includes(cloud.preferred_currency) ? cloud.preferred_currency : "EUR";
    setYourName(nextName);
    setProfileAvatar(nextAvatar);
    setProfileHome(nextHome);
    setProfileBio(nextBio);
    setProfileCurrency(nextCurrency);
    setGroupCurrency(nextCurrency);
    localStorage.setItem("wayfare_profile_name", nextName);
    localStorage.setItem("wayfare_profile_avatar", nextAvatar);
    localStorage.setItem("wayfare_profile_home", nextHome);
    localStorage.setItem("wayfare_profile_bio", nextBio);
    localStorage.setItem("wayfare_profile_currency", nextCurrency);
  }, [account.profile]);

  useEffect(() => {
    if (account.loading) return;
    if (!account.user) {
      setTrips([]);
      setRecentActivities([]);
      setTripsReady(true);
      return;
    }
    let cancelled = false;
    async function loadAccountTrips() {
      const legacyTrips = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (key.startsWith("wayfare_name_")) legacyTrips.push({ id: key.replace("wayfare_name_", ""), name: localStorage.getItem(key) || "" });
      }
      await Promise.allSettled(legacyTrips.map((legacy) => supabase.rpc("claim_legacy_trip", { target_trip: legacy.id, member_name: legacy.name })));
      const { data } = await supabase.from("travelers").select("trip_id").eq("user_id", account.user.id);
      const accountTripIds = [...new Set((data || []).map((item) => item.trip_id).filter(Boolean))];
      if (!accountTripIds.length) {
        if (!cancelled) {
          setTrips([]);
          setRecentActivities([]);
          setTripsReady(true);
        }
        return;
      }
      const { data: accountTrips } = await supabase.from("trips").select("id,name,start_date,end_date,created_at,currency,duration_days").in("id", accountTripIds);
      if (cancelled) return;
      setTrips((accountTrips || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
      setTripsReady(true);
      const { data: accountActivities } = await supabase.from("activities").select("id,trip_id,name,created_at").in("trip_id", accountTripIds).order("created_at", { ascending: false }).limit(20);
      if (!cancelled) setRecentActivities(accountActivities || []);
    }
    loadAccountTrips();
    return () => { cancelled = true; };
  }, [account.loading, account.user?.id]);

  const loadFriends = useCallback(async () => {
    if (!account.user) {
      setFriends([]);
      return;
    }
    setFriendsLoading(true);
    const { data, error } = await supabase.rpc("list_friends");
    setFriendsLoading(false);
    if (!error) setFriends(data || []);
  }, [account.user?.id]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const loadFriendBalances = useCallback(async () => {
    const acceptedFriendIds = friends.filter((friend) => friend.status === "accepted").map((friend) => friend.friend_id);
    if (!account.user || !trips.length || !acceptedFriendIds.length) {
      setFriendBalances({});
      return;
    }
    setFriendBalancesLoading(true);
    const tripIds = trips.map((trip) => trip.id);
    const tripCurrency = {};
    trips.forEach((trip) => { tripCurrency[trip.id] = trip.currency || "EUR"; });

    const [{ data: travelerRows }, { data: costRows }, { data: activityRows }, { data: settlementRows }] = await Promise.all([
      supabase.from("travelers").select("id,trip_id,user_id").in("trip_id", tripIds),
      supabase.from("extra_costs").select("id,trip_id,amount,currency,exchange_rate,paid_by").in("trip_id", tripIds),
      supabase.from("activities").select("id,trip_id,cost_pp,paid_by").in("trip_id", tripIds),
      supabase.from("settlements").select("trip_id,from_traveler,to_traveler,amount").in("trip_id", tripIds),
    ]);
    const costIds = (costRows || []).map((cost) => cost.id);
    const { data: splitRows } = costIds.length
      ? await supabase.from("expense_splits").select("expense_id,traveler_id,owed_amount").in("expense_id", costIds)
      : { data: [] };

    const travelersByTrip = {};
    (travelerRows || []).forEach((traveler) => {
      (travelersByTrip[traveler.trip_id] = travelersByTrip[traveler.trip_id] || []).push(traveler);
    });

    const result = {};
    function credit(friendId, currencyCode, amount) {
      if (!amount) return;
      result[friendId] = result[friendId] || {};
      result[friendId][currencyCode] = roundMoney((result[friendId][currencyCode] || 0) + amount);
    }

    Object.entries(travelersByTrip).forEach(([tripId, tripTravelers]) => {
      const meRow = tripTravelers.find((traveler) => traveler.user_id === account.user.id);
      if (!meRow) return;
      const friendRows = tripTravelers.filter((traveler) => acceptedFriendIds.includes(traveler.user_id));
      if (!friendRows.length) return;

      const travelerIds = tripTravelers.map((traveler) => traveler.id);
      const paid = {};
      const owed = {};
      travelerIds.forEach((id) => { paid[id] = 0; owed[id] = 0; });

      (activityRows || []).filter((activity) => activity.trip_id === tripId).forEach((activity) => {
        const total = roundMoney(Number(activity.cost_pp || 0) * travelerIds.length);
        if (total > 0 && activity.paid_by) {
          paid[activity.paid_by] = roundMoney((paid[activity.paid_by] || 0) + total);
          const share = roundMoney(total / travelerIds.length);
          travelerIds.forEach((id) => { owed[id] = roundMoney((owed[id] || 0) + share); });
        }
      });

      (costRows || []).filter((cost) => cost.trip_id === tripId).forEach((cost) => {
        const rate = Number(cost.exchange_rate) || 1;
        const base = roundMoney(Number(cost.amount) * rate);
        if (cost.paid_by) paid[cost.paid_by] = roundMoney((paid[cost.paid_by] || 0) + base);
        const splits = (splitRows || []).filter((split) => split.expense_id === cost.id);
        if (splits.length) {
          const weightTotal = splits.reduce((sum, split) => sum + Number(split.owed_amount || 0), 0) || 1;
          splits.forEach((split) => {
            const share = roundMoney((Number(split.owed_amount || 0) / weightTotal) * base);
            owed[split.traveler_id] = roundMoney((owed[split.traveler_id] || 0) + share);
          });
        } else {
          const share = roundMoney(base / travelerIds.length);
          travelerIds.forEach((id) => { owed[id] = roundMoney((owed[id] || 0) + share); });
        }
      });

      (settlementRows || []).filter((settlement) => settlement.trip_id === tripId).forEach((settlement) => {
        const amount = roundMoney(settlement.amount);
        paid[settlement.from_traveler] = roundMoney((paid[settlement.from_traveler] || 0) + amount);
        paid[settlement.to_traveler] = roundMoney((paid[settlement.to_traveler] || 0) - amount);
      });

      const nets = {};
      travelerIds.forEach((id) => { nets[id] = roundMoney((paid[id] || 0) - (owed[id] || 0)); });

      const debtors = Object.entries(nets).filter(([, value]) => value < -0.009).map(([id, value]) => ({ id, amt: -value }));
      const creditors = Object.entries(nets).filter(([, value]) => value > 0.009).map(([id, value]) => ({ id, amt: value }));
      let di = 0, ci = 0;
      while (di < debtors.length && ci < creditors.length) {
        const amt = roundMoney(Math.min(debtors[di].amt, creditors[ci].amt));
        const fromId = debtors[di].id, toId = creditors[ci].id;
        if (fromId === meRow.id) {
          const friendRow = friendRows.find((row) => row.id === toId);
          if (friendRow) credit(friendRow.user_id, tripCurrency[tripId], -amt);
        } else if (toId === meRow.id) {
          const friendRow = friendRows.find((row) => row.id === fromId);
          if (friendRow) credit(friendRow.user_id, tripCurrency[tripId], amt);
        }
        debtors[di].amt -= amt; creditors[ci].amt -= amt;
        if (debtors[di].amt < 0.009) di++;
        if (creditors[ci].amt < 0.009) ci++;
      }
    });

    setFriendBalancesLoading(false);
    setFriendBalances(result);
  }, [account.user?.id, trips, friends]);

  useEffect(() => { loadFriendBalances(); }, [loadFriendBalances]);

  async function sendFriendRequest() {
    const email = friendEmail.trim();
    if (!email) {
      setFriendError("Enter their email first.");
      return;
    }
    setFriendSending(true);
    setFriendError("");
    const { error } = await supabase.rpc("send_friend_request", { friend_email: email });
    setFriendSending(false);
    if (error) {
      setFriendError(error.message || "Couldn't send that request.");
      return;
    }
    setFriendEmail("");
    setActionNotice("Friend request sent.");
    setTimeout(() => setActionNotice(""), 3200);
    await loadFriends();
  }

  async function respondFriendRequest(friendshipId, accept) {
    setFriendActionId(friendshipId);
    const { error } = await supabase.rpc("respond_friend_request", { friendship_id: friendshipId, accept });
    setFriendActionId(null);
    if (error) {
      setActionNotice(`Couldn't update that request: ${error.message}`);
      setTimeout(() => setActionNotice(""), 3200);
      return;
    }
    await loadFriends();
  }

  async function removeFriend(friendshipId) {
    setFriendActionId(friendshipId);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriendActionId(null);
    if (error) {
      setActionNotice(`Couldn't remove: ${error.message}`);
      setTimeout(() => setActionNotice(""), 3200);
      return;
    }
    setActionNotice("Friend removed.");
    setTimeout(() => setActionNotice(""), 3200);
    await loadFriends();
  }

  useEffect(() => {
    if (!account.user || account.profile || yourName.trim()) return;
    const metadata = account.user.user_metadata || {};
    setYourName(metadata.full_name || metadata.name || account.user.email?.split("@")[0] || "");
    if (!profileAvatar) setProfileAvatar(metadata.avatar_url || metadata.picture || "");
  }, [account.user, account.profile, yourName, profileAvatar]);

  const tripById = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip])), [trips]);
  const planTrips = useMemo(() => trips.filter((trip) => !isExpenseGroup(trip)), [trips]);
  const expenseGroups = useMemo(() => trips.filter(isExpenseGroup), [trips]);
  const acceptedFriends = useMemo(() => friends.filter((friend) => friend.status === "accepted"), [friends]);
  const incomingFriendRequests = useMemo(() => friends.filter((friend) => friend.status === "pending" && friend.direction === "incoming"), [friends]);
  const outgoingFriendRequests = useMemo(() => friends.filter((friend) => friend.status === "pending" && friend.direction === "outgoing"), [friends]);

  function changeTripDuration(value) {
    const nextDays = Math.max(1, Math.min(30, Number(value) || 1));
    setTripDays(nextDays);
    if (tripStartDate) setTripEndDate(endDateForDuration(tripStartDate, nextDays));
  }

  function changeTripStartDate(value) {
    setTripStartDate(value);
    setTripEndDate(value ? endDateForDuration(value, tripDays) : "");
  }

  function changeTripEndDate(value) {
    setTripEndDate(value);
    const days = inclusiveDays(tripStartDate, value);
    if (days) setTripDays(Math.min(30, days));
  }

  async function saveProfile() {
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    localStorage.setItem("wayfare_profile_avatar", profileAvatar);
    localStorage.setItem("wayfare_profile_home", profileHome.trim());
    localStorage.setItem("wayfare_profile_bio", profileBio.trim());
    localStorage.setItem("wayfare_profile_currency", profileCurrency);
    setGroupCurrency(profileCurrency);
    const cloudResult = await account.saveProfile({ name: yourName, avatar: profileAvatar, home: profileHome, bio: profileBio, currency: profileCurrency });
    if (cloudResult.error) setActionNotice(`Saved on this device, but cloud sync failed: ${cloudResult.error.message}`);
    else setActionNotice(account.user ? "Your profile was saved and synced." : "Your guest profile was saved on this device.");
    setTimeout(() => setActionNotice(""), 3200);
  }

  function navigateView(view) {
    setActiveView(view);
    router.replace(view === "plans" ? "/" : `/?view=${view}`, { scroll: false });
  }

  async function createTrip() {
    if (!account.user) {
      setError("Sign in before creating a private trip.");
      return;
    }
    if (!tripName.trim() || !yourName.trim()) {
      setError("Add a trip title and your name first.");
      return;
    }
    setLoading(true);
    setError("");
    const { data: trip, error: tripErr } = await supabase.from("trips").insert({
      name: tripName.trim(),
      duration_days: Math.max(1, Math.min(30, Number(tripDays) || 1)),
      start_date: tripStartDate || null,
      end_date: tripEndDate || null,
      currency: profileCurrency,
      created_by: account.user?.id || null,
    }).select().single();
    if (tripErr) {
      setError(`Couldn't create the trip: ${tripErr.message || "try again."}`);
      setLoading(false);
      return;
    }
    const { error: travelerErr } = await supabase.from("travelers").insert({ trip_id: trip.id, name: yourName.trim(), avatar: profileAvatar || null, user_id: account.user?.id || null, role: "owner" });
    if (travelerErr) {
      setError("Trip created, but couldn't add you as a traveler.");
      setLoading(false);
      return;
    }
    localStorage.setItem(`wayfare_name_${trip.id}`, yourName.trim());
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    router.push(`/trip/${trip.id}`);
  }

  async function deletePlan() {
    if (!deletePlanTarget || deletingPlan) return;
    setDeletingPlan(true);
    const target = deletePlanTarget;
    const { error: deleteError } = await supabase.from("trips").delete().eq("id", target.id);
    setDeletingPlan(false);
    if (deleteError) {
      setActionNotice(`Couldn't delete ${displayTripName(target)}: ${deleteError.message}`);
      return;
    }
    localStorage.removeItem(`wayfare_name_${target.id}`);
    localStorage.removeItem(`wayfare_currency_${target.id}`);
    localStorage.removeItem(`wayfare_expense_group_${target.id}`);
    setTrips((current) => current.filter((trip) => trip.id !== target.id));
    setRecentActivities((current) => current.filter((activity) => activity.trip_id !== target.id));
    setDeletePlanTarget(null);
    setActionNotice(`${displayTripName(target)} was deleted.`);
    setTimeout(() => setActionNotice(""), 4200);
  }

  async function chooseProfilePhoto(file) {
    if (!file) return;
    try {
      const photo = await compressProfilePhoto(file);
      setProfileAvatar(photo);
      localStorage.setItem("wayfare_profile_avatar", photo);
    } catch {
      setActionNotice("That photo couldn't be used. Try a JPG or PNG.");
    }
  }

  async function createExpenseGroup() {
    if (!account.user) {
      setSettleError("Sign in before creating a private expense group.");
      return;
    }
    if (!groupName.trim() || !yourName.trim()) {
      setSettleError("Add a group name and your name first.");
      return;
    }
    setGroupCreating(true);
    setSettleError("");
    const { data: group, error: groupErr } = await supabase.from("trips").insert({
      name: `${EXPENSE_GROUP_PREFIX}${groupName.trim()}`,
      currency: groupCurrency,
      created_by: account.user?.id || null,
    }).select().single();
    if (groupErr) {
      setSettleError(`Couldn't create this expense group: ${groupErr.message || "try again."}`);
      setGroupCreating(false);
      return;
    }
    const { error: travelerErr } = await supabase.from("travelers").insert({ trip_id: group.id, name: yourName.trim(), avatar: profileAvatar || null, user_id: account.user?.id || null, role: "owner" });
    if (travelerErr) {
      setSettleError("Group created, but couldn't add you as a member.");
      setGroupCreating(false);
      return;
    }
    localStorage.setItem(`wayfare_name_${group.id}`, yourName.trim());
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    localStorage.setItem(`wayfare_expense_group_${group.id}`, "true");
    router.push(`/trip/${group.id}?view=settle`);
  }

  if (account.loading) return <main className="auth-shell"><div className="auth-loading"><div className="brand-mark dark">PALVOYA</div><p>Checking your secure session…</p></div></main>;

  if (!account.user) return (
    <main className="auth-shell">
      <section className="auth-welcome">
        <div className="brand-mark dark">PALVOYA</div>
        <span className="eyebrow">Private group travel</span>
        <h1>Your plans belong to your group.</h1>
        <p>Sign in to create trips, invite friends, vote on activities, and settle expenses securely.</p>
        <div className="auth-benefits"><span>✓ Member-only trips</span><span>✓ Private expenses</span><span>✓ Synced profile</span></div>
        <AccountPanel account={account} displayName={yourName} redirectTo={typeof window === "undefined" ? undefined : window.location.href} />
      </section>
    </main>
  );

  const filteredPlanTrips = planTrips.filter((trip) => trip.name.toLowerCase().includes(tripSearch.trim().toLowerCase()));

  const savedTripsBlock = planTrips.length > 0 && (
    <div className="saved-trips">
      <div className="section-title-row"><h2>Your next chapters</h2><span>{planTrips.length} trips</span></div>
      <input className="trip-search" aria-label="Search your trips" placeholder="Find a trip…" value={tripSearch} onChange={(event) => setTripSearch(event.target.value)} />
      {filteredPlanTrips.map((trip) => (
        <div className="saved-trip-row" key={trip.id}>
          <button className="saved-trip-card" onClick={() => router.push(`/trip/${trip.id}`)}>
            <DestinationCover name={trip.name} />
            <div className="destination-card-copy"><small>{tripDateLabel(trip)}</small><strong>{trip.name}</strong><span>Plan it together <b aria-hidden="true">↗</b></span></div>
          </button>
          <button className="plan-delete-button" aria-label={`Delete ${trip.name} plan`} title="Delete plan" onClick={() => setDeletePlanTarget(trip)}>×</button>
        </div>
      ))}
      {tripSearch && !filteredPlanTrips.length && <p className="search-empty" role="status">No trips match “{tripSearch}”. Try another name.</p>}
    </div>
  );

  const plansLoadingBlock = (
    <div className="plans-loading-skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  );

  const emptyPlansHeroBlock = (
    <div className="app-welcome journey-welcome">
      <div className="eyebrow">Hey {yourName.trim().split(/\s+/)[0] || "traveler"}, where next?</div>
      <h1>Good trips.<br /><span>Great company.</span></h1>
      <p>A little planning. A lot to look forward to. Tap the + up top to start your first trip.</p>
    </div>
  );

  const journeyShortcutsBlock = (
    <div className="journey-shortcuts"><button onClick={() => navigateView("settle")}><span className="shortcut-icon"><NavIcon name="settle" /></span><span><strong>Split the good times</strong><small>Dinners, trips & everything shared</small></span><span aria-hidden="true">↗</span></button></div>
  );

  const quickCreateBlock = (
    <section className="quick-create-card" ref={createRef} hidden={!createOpen}>
      <button type="button" className="close-create" aria-label="Close new trip form" onClick={() => setCreateOpen(false)}>×</button>
      <div className="eyebrow">New plan</div>
      <h2>Create a trip</h2>
      <label className="field-label">Trip title</label>
      <input placeholder="e.g. Barcelona with friends" value={tripName} onChange={(e) => setTripName(e.target.value)} />
      <div className="trip-date-card">
        <div className="trip-date-heading"><div><strong>Trip dates</strong><small>Optional — you can decide later</small></div><span>Calendar</span></div>
        <div className="trip-date-grid">
          <label><span>Starts</span><input aria-label="Trip start date" type="date" value={tripStartDate} onChange={(event) => changeTripStartDate(event.target.value)} /></label>
          <label><span>Ends</span><input aria-label="Trip end date" type="date" min={tripStartDate || undefined} value={tripEndDate} onChange={(event) => changeTripEndDate(event.target.value)} disabled={!tripStartDate} /></label>
        </div>
      </div>
      <label className="field-label">How many days?</label>
      <div className="duration-input"><button type="button" onClick={() => changeTripDuration(Number(tripDays) - 1)}>−</button><input aria-label="Trip duration in days" type="number" min="1" max="30" value={tripDays} onChange={(event) => changeTripDuration(event.target.value)} /><span>days</span><button type="button" onClick={() => changeTripDuration(Number(tripDays) + 1)}>＋</button></div>
      <label className="field-label">Your name</label>
      <input placeholder="So friends know it's you" value={yourName} onChange={(e) => setYourName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTrip()} />
      {error && <p className="form-error">{error}</p>}
      <button onClick={createTrip} disabled={loading}>{loading ? "Creating…" : "Create plan →"}</button>
    </section>
  );

  const groupFormCard = (
    <section className="quick-create-card settle-quick-create" ref={groupFormRef} hidden={!groupFormOpen}>
      <button type="button" className="close-create" aria-label="Close new group form" onClick={() => setGroupFormOpen(false)}>×</button>
      <div className="eyebrow">New group</div>
      <h2>Create an expense group</h2>
      <div className="expense-group-examples"><span>Groceries</span><span>Apartment</span><span>Weekend dinner</span></div>
      <label className="field-label">Group name</label>
      <input placeholder="e.g. Apartment expenses" value={groupName} onChange={(event) => { setGroupName(event.target.value); setSettleError(""); }} />
      <div className="expense-form-grid">
        <div><label className="field-label">Your name</label><input placeholder="So everyone knows it's you" value={yourName} onChange={(event) => setYourName(event.target.value)} /></div>
        <div><label className="field-label">Currency</label><select value={groupCurrency} onChange={(event) => setGroupCurrency(event.target.value)}>{CURRENCY_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}</select></div>
      </div>
      {settleError && <p className="form-error">{settleError}</p>}
      <button className="create-expense-group" onClick={createExpenseGroup} disabled={groupCreating}>{groupCreating ? "Creating…" : "Create group and add expenses →"}</button>
    </section>
  );

  const settleListsBlock = (
    <div className="settle-lists">
      {expenseGroups.length > 0 && <><div className="section-title-row settle-section-title"><h2>Expense groups</h2><span>{expenseGroups.length}</span></div>{expenseGroups.map((group) => <div className="saved-trip-row settle-row-wrap" key={group.id}><button className="feed-row settle-destination-row" onClick={() => router.push(`/trip/${group.id}?view=settle`)}><span className="feed-icon"><ExpenseIcon name={autoGroupIcon(displayTripName(group))} label="Everyday group" /></span><div><small className="row-kicker">EVERYDAY GROUP</small><strong>{displayTripName(group)}</strong><small>Add expenses and see who owes whom</small></div></button><button className="plan-delete-button" aria-label={`Delete ${displayTripName(group)} group`} title="Delete group" onClick={() => setDeletePlanTarget(group)}>×</button></div>)}</>}
      {planTrips.length > 0 && <><div className="section-title-row settle-section-title"><h2>Trips</h2><span>{planTrips.length}</span></div>{planTrips.map((trip) => <button className="feed-row settle-destination-row" key={trip.id} onClick={() => router.push(`/trip/${trip.id}?view=settle`)}><span className="feed-icon"><ExpenseIcon name={autoTripIcon(trip.name)} label="Trip" /></span><div><small className="row-kicker">TRIP EXPENSES</small><strong>{trip.name}</strong><small>Use during the trip or settle afterward</small></div></button>)}</>}
    </div>
  );

  return (
    <main className="mobile-app-home">
      <header className="app-header">
        <div><div className="brand-mark dark">PALVOYA</div><p>Plan together. Settle simply.</p></div>
        <div className="app-header-actions">
          {(activeView === "plans" || activeView === "settle") && (
            <button type="button" className="header-add-button" onClick={handleHeaderAdd}><span aria-hidden="true">＋</span>{activeView === "settle" ? "New group" : "New trip"}</button>
          )}
          <button type="button" className="header-profile-button" aria-label="Open your profile" onClick={() => navigateView("profile")}><AvatarPreview name={yourName} avatar={profileAvatar} /></button>
        </div>
      </header>

      <div className="app-content">
        {activeView === "plans" && (
          <section className="plans-home-view">
            {!tripsReady ? plansLoadingBlock : (planTrips.length > 0 ? savedTripsBlock : emptyPlansHeroBlock)}
            {journeyShortcutsBlock}
            {quickCreateBlock}
          </section>
        )}

        {activeView === "settle" && <section className="simple-app-view settle-home-view">
          <div className="eyebrow">Shared expenses</div><h1>Settle up</h1><p className="view-intro">Use a trip, or create an everyday group without planning anything first. Tap the + up top to start one.</p>

          {!tripsReady ? plansLoadingBlock : ((expenseGroups.length > 0 || planTrips.length > 0) ? settleListsBlock : <EmptyView title="Nothing to settle yet" text="Tap the + up top to create an expense group, or make a trip from Plans." />)}
          {groupFormCard}
        </section>}

        {activeView === "updates" && <section className="simple-app-view">
          <div className="eyebrow">Latest activity</div><h1>Updates</h1><p className="view-intro">New suggestions and changes across your plans.</p>
          <UpdatesFeed notifications={notifications} onOpen={(entry) => router.push(`/trip/${entry.tripId}?view=updates`)} />
        </section>}

        {activeView === "profile" && <section className="simple-app-view profile-view">
          <div className="eyebrow">Your personal space</div><h1>My profile</h1><p className="view-intro">Your details, your style. One profile for every plan.</p>
          <div className="profile-hero-card">
            <AvatarPreview name={yourName} avatar={profileAvatar} className="large-profile-bubble" />
            <div className="profile-identity"><span className="profile-kicker">Nice to see you</span><h2>{yourName.trim() || "Your name"}</h2><p>{profileHome.trim() || "Make yourself at home"}</p></div>
            <span className="profile-device-badge">Private account</span>
          </div>
          <div className="profile-stats" aria-label="Your Palvoya activity">
            <div><strong>{planTrips.length}</strong><span>Trips</span></div>
            <div><strong>{expenseGroups.length}</strong><span>Groups</span></div>
            <div><strong>{recentActivities.length}</strong><span>Updates</span></div>
          </div>
          <AccountPanel account={account} displayName={yourName} />
          <div className="profile-card friends-card">
            <div className="profile-section-heading"><div><h3>Friends</h3><p>Add a friend once, then drop them straight into any trip or expense group — no invite link needed.</p></div></div>
            <div className="friend-add-row">
              <input aria-label="Friend's email" type="email" placeholder="friend@email.com" value={friendEmail} onChange={(event) => { setFriendEmail(event.target.value); setFriendError(""); }} onKeyDown={(event) => event.key === "Enter" && sendFriendRequest()} />
              <button type="button" onClick={sendFriendRequest} disabled={friendSending}>{friendSending ? "Sending…" : "Add friend"}</button>
            </div>
            {friendError && <p className="form-error">{friendError}</p>}

            {incomingFriendRequests.length > 0 && <div className="friend-group">
              <div className="field-label">Requests</div>
              {incomingFriendRequests.map((friend) => (
                <div className="friend-row" key={friend.friendship_id}>
                  <span><AvatarPreview name={friend.display_name} avatar={friend.avatar} className="profile-bubble" /><b>{friend.display_name || "Someone"}</b></span>
                  <span className="friend-row-actions">
                    <button type="button" onClick={() => respondFriendRequest(friend.friendship_id, true)} disabled={friendActionId === friend.friendship_id}>Accept</button>
                    <button type="button" className="friend-decline" onClick={() => respondFriendRequest(friend.friendship_id, false)} disabled={friendActionId === friend.friendship_id}>Decline</button>
                  </span>
                </div>
              ))}
            </div>}

            {outgoingFriendRequests.length > 0 && <div className="friend-group">
              <div className="field-label">Sent</div>
              {outgoingFriendRequests.map((friend) => (
                <div className="friend-row" key={friend.friendship_id}>
                  <span><AvatarPreview name={friend.display_name} avatar={friend.avatar} className="profile-bubble" /><b>{friend.display_name || "Someone"}</b></span>
                  <span className="friend-row-actions"><small>Pending</small><button type="button" className="friend-decline" onClick={() => removeFriend(friend.friendship_id)} disabled={friendActionId === friend.friendship_id}>Cancel</button></span>
                </div>
              ))}
            </div>}

            <div className="friend-group">
              <div className="field-label">Your friends{acceptedFriends.length > 0 ? ` (${acceptedFriends.length})` : ""}</div>
              {friendsLoading && !friends.length ? <p className="group-hint">Loading friends…</p> : acceptedFriends.length > 0 ? acceptedFriends.map((friend) => {
                const balance = friendBalances[friend.friend_id] || {};
                const entries = Object.entries(balance).filter(([, amount]) => Math.abs(amount) > 0.009);
                return (
                  <div className="friend-row" key={friend.friendship_id}>
                    <span><AvatarPreview name={friend.display_name} avatar={friend.avatar} className="profile-bubble" /><b>{friend.display_name || "Someone"}</b></span>
                    <span className="friend-row-actions">
                      <span className="friend-balance">
                        {friendBalancesLoading && !entries.length ? null : entries.length === 0 ? (
                          <small className="friend-balance-settled">settled up</small>
                        ) : (
                          entries.map(([code, amount]) => (
                            <small key={code} className={amount > 0 ? "friend-balance-owed" : "friend-balance-owes"}>
                              {amount > 0 ? "owes you " : "you owe "}{moneyIn(Math.abs(amount), code)}
                            </small>
                          ))
                        )}
                      </span>
                      <button type="button" className="friend-decline" onClick={() => removeFriend(friend.friendship_id)} disabled={friendActionId === friend.friendship_id}>Remove</button>
                    </span>
                  </div>
                );
              }) : <p className="group-hint">No friends yet — add one by email above. They need a Palvoya account first.</p>}
            </div>
          </div>
          <div className="profile-card profile-editor-card">
            <div className="profile-section-heading"><div><h3>Photo or avatar</h3><p>Choose what friends see beside your votes and expenses.</p></div></div>
            <div className="avatar-picker">{AVATAR_OPTIONS.map((avatar) => <button type="button" key={avatar} aria-label={`Use ${avatar} avatar`} className={profileAvatar === avatar ? "selected" : ""} onClick={() => setProfileAvatar(avatar)}>{avatar}</button>)}</div>
            <label className="photo-upload-button">Upload your photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseProfilePhoto(event.target.files?.[0])} /></label>
            <div className="profile-fields">
              <label><span className="field-label">Display name</span><input placeholder="Your name" value={yourName} onChange={(event) => setYourName(event.target.value)} /></label>
              <label><span className="field-label">Home city</span><input placeholder="e.g. Dubai" value={profileHome} onChange={(event) => setProfileHome(event.target.value)} /></label>
              <label className="profile-field-wide"><span className="field-label">About you</span><textarea rows="3" maxLength="140" placeholder="Travel style, favourite food, or anything your friends should know" value={profileBio} onChange={(event) => setProfileBio(event.target.value)} /></label>
              <label className="profile-field-wide"><span className="field-label">Preferred currency</span><select value={profileCurrency} onChange={(event) => setProfileCurrency(event.target.value)}>{CURRENCY_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
            </div>
            <button type="button" className="save-profile-button" onClick={saveProfile}>Save profile</button>
            <p className="profile-privacy-note">Saved privately to your Palvoya account and available on your other devices.</p>
          </div>
        </section>}
      </div>

      {deletePlanTarget && <div className="confirm-backdrop" role="presentation" onClick={() => !deletingPlan && setDeletePlanTarget(null)}><div className="confirm-sheet plan-delete-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onClick={(event) => event.stopPropagation()}><div className="confirm-icon">×</div><h3 id="delete-plan-title">Delete “{displayTripName(deletePlanTarget)}”?</h3><p>{isExpenseGroup(deletePlanTarget) ? "This permanently removes the group and its shared expenses for everyone with the link." : "This permanently removes the plan, its activities, votes, comments, and expenses for everyone with the link."}</p><div className="confirm-actions"><button onClick={() => setDeletePlanTarget(null)} disabled={deletingPlan}>Cancel</button><button className="danger-button" onClick={deletePlan} disabled={deletingPlan}>{deletingPlan ? "Deleting…" : isExpenseGroup(deletePlanTarget) ? "Delete group" : "Delete plan"}</button></div></div></div>}
      {actionNotice && <div className="action-notice" role="status">{actionNotice}</div>}
      <UpdateToast notification={notifications.toast} onOpen={() => { notifications.dismiss(); navigateView("updates"); }} onDismiss={notifications.dismiss} />

      <nav className="mobile-bottom-nav home-bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => <button key={item.id} className={`bottom-nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => navigateView(item.id)}>{item.id === "updates" ? <UpdateBadge count={notifications.unread} /> : <NavIcon name={item.icon} />}<small>{item.label}</small></button>)}
      </nav>
    </main>
  );
}

function EmptyView({ title, text }) {
  return <div className="app-empty"><span>✦</span><h3>{title}</h3><p>{text}</p></div>;
}
