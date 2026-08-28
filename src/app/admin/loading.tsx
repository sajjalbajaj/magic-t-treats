import { CocoaSpinner } from "@/components/ui/loaders";

/**
 * Dashboard loading state.
 *
 * Deliberately plain. The bakery animation belongs on the shop window; the
 * back office is a tool the baker uses many times a day, and a bouncing
 * chocolate bite on every navigation would wear out fast.
 */
export default function AdminLoading() {
  return <CocoaSpinner label="Loading your dashboard…" />;
}
