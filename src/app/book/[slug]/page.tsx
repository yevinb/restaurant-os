import PublicBookingClient from "./booking-client";

export default function BookPage({ params }: { params: { slug: string } }) {
  return <PublicBookingClient slug={params.slug} />;
}
