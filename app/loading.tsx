import AccentureLogoLoader from "@/components/AccentureLogoLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <AccentureLogoLoader
        label="Loading bench data"
        hint="Fetching the latest snapshot — this usually takes a few seconds."
      />
    </div>
  );
}
