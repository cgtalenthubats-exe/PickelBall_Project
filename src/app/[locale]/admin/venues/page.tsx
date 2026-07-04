import Image from "next/image";
import { Plus, MapPin, Pencil, Layers, X, Upload } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { getDbVenues } from "@/lib/data/admin";

export default async function VenuesPage() {
  const venues = await getDbVenues();
  const gallery = venues[0]?.gallery ?? [];

  return (
    <div>
      <PageTitle
        title="จัดการสาขา"
        subtitle="เพิ่ม แก้ไข และปักหมุดตำแหน่งของแต่ละสาขา"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Plus className="w-4 h-4" />
            เพิ่มสาขา
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {venues.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl bg-surface border border-line overflow-hidden"
          >
            <iframe
              title={`แผนที่ ${b.name}`}
              src={`https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed`}
              loading="lazy"
              className="w-full h-36 border-0"
            />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg text-pine leading-tight">
                  {b.name}
                </h3>
                <Badge tone={b.status === "active" ? "green" : "gray"}>
                  {b.status === "active" ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                </Badge>
              </div>
              <div className="flex items-start gap-1.5 text-sm text-taupe mt-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                {b.address}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-taupe mt-1.5">
                <Layers className="w-4 h-4" />
                {b.courtCount} คอร์ท
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {b.amenities.map((a) => (
                  <span
                    key={a}
                    className="text-[11px] text-taupe bg-bone rounded-full px-2 py-0.5"
                  >
                    {a}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm border border-line rounded-lg py-2 text-ink hover:border-brass transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
                <button className="flex-1 text-sm border border-line rounded-lg py-2 text-taupe hover:border-brass transition-colors">
                  {b.status === "active" ? "ปิดชั่วคราว" : "เปิดใช้งาน"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <SectionCard title={`แก้ไขข้อมูลสาขา — ${venues[0]?.name ?? ""}`}>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="text-taupe">ชื่อสาขา</span>
              <div className="mt-1 rounded-xl border border-line bg-bone/40 px-3 py-2.5 text-ink">
                {venues[0]?.name}
              </div>
            </label>
            <label className="text-sm">
              <span className="text-taupe">จำนวนคอร์ท</span>
              <div className="mt-1 rounded-xl border border-line bg-bone/40 px-3 py-2.5 text-ink tnum">
                {venues[0]?.courtCount}
              </div>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="text-taupe">ที่อยู่</span>
              <div className="mt-1 rounded-xl border border-line bg-bone/40 px-3 py-2.5 text-ink">
                {venues[0]?.address}
              </div>
            </label>
            <label className="text-sm">
              <span className="text-taupe">พิกัด (Google Map)</span>
              <div className="mt-1 rounded-xl border border-line bg-bone/40 px-3 py-2.5 text-ink tnum">
                {venues[0]?.lat}, {venues[0]?.lng}
              </div>
            </label>
            <label className="text-sm">
              <span className="text-taupe">สิ่งอำนวยความสะดวก</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(venues[0]?.amenities ?? []).map((a) => (
                  <span
                    key={a}
                    className="text-xs text-pine bg-lime-soft rounded-full px-2.5 py-1"
                  >
                    {a} ✕
                  </span>
                ))}
                <span className="text-xs text-taupe border border-dashed border-line rounded-full px-2.5 py-1">
                  + เพิ่ม
                </span>
              </div>
            </label>

            <div className="text-sm md:col-span-2">
              <span className="text-taupe">รูปภาพสาขา (แกลเลอรี)</span>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line group"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                    <button
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/60 text-bone flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="ลบรูป"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-pine text-bone rounded px-1.5 py-0.5">
                        ปก
                      </span>
                    )}
                  </div>
                ))}
                <button className="aspect-[4/3] rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center text-taupe hover:border-brass hover:text-brass transition-colors cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <span className="text-[11px] mt-1">อัปโหลด</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2 pt-1">
              <button className="text-sm bg-pine text-bone rounded-xl px-5 py-2.5 hover:bg-pine-deep transition-colors">
                บันทึก
              </button>
              <button className="text-sm border border-line rounded-xl px-5 py-2.5 text-taupe hover:border-brass transition-colors">
                ยกเลิก
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
