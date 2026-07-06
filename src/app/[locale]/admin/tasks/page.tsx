import { PageTitle } from "@/components/admin/kit";
import { getDbTasks } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";
import { TasksManager } from "@/components/admin/tasks-manager";

export default async function TasksPage() {
  const tasks = await getDbTasks();
  const supabase = await createClient();
  const { data: vs } = await supabase
    .from("venues")
    .select("id, name, courts(id,name)")
    .order("name");
  const venueOpts = (
    (vs ?? []) as unknown as {
      id: string;
      name: string;
      courts: { id: string; name: string }[];
    }[]
  ).map((v) => ({
    id: v.id,
    name: v.name,
    courts: (v.courts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div>
      <PageTitle
        title="ตารางงาน"
        subtitle="งานเตรียมพื้นที่และคิวทำความสะอาดต่อสาขา/คอร์ท (แสดงให้พนักงานดู)"
      />
      <TasksManager tasks={tasks} venues={venueOpts} />
    </div>
  );
}
