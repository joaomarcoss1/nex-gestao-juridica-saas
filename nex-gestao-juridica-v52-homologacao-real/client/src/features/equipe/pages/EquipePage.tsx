import { useState } from "react";
import { Building2, Crown, Plus, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import type { Department, Employee, FeaturePageProps, PointSchedule, Team, TeamMember, Unit } from "@/types/app";
import { enterpriseRoles } from "@/data/legalEnterprise";
import { ActionBar, Button, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, todayIso, uid } from "@/utils/format";

function employeeLabel(employee?: Employee) { return employee ? employee.name : "Não definido"; }
function blankUnit(props: FeaturePageProps): Unit { return { id: uid("unit"), organizationId: props.state.organizations[0]?.id ?? "demo", name: "Nova unidade", city: "", state: "MA", managerId: props.state.employees[0]?.id, status: "Ativa" }; }
function blankDepartment(props: FeaturePageProps): Department { return { id: uid("dept"), organizationId: props.state.organizations[0]?.id ?? "demo", unitId: props.state.units[0]?.id, name: "Novo departamento", legalArea: "Operações", managerId: props.state.employees[0]?.id, status: "Ativo" }; }
function blankTeam(props: FeaturePageProps): Team { return { id: uid("team"), organizationId: props.state.organizations[0]?.id ?? "demo", unitId: props.state.units[0]?.id, departmentId: props.state.departments[0]?.id, name: "Nova célula jurídica", coordinatorId: props.state.employees[0]?.id, legalArea: "Full service", capacity: 30, status: "Ativa" }; }
function blankMember(teamId: string, props: FeaturePageProps): TeamMember { return { id: uid("member"), teamId, employeeId: props.state.employees[0]?.id ?? "", role: "Advogado", workloadPercent: 50 }; }
function blankSchedule(employeeId: string, props: FeaturePageProps): PointSchedule { const employee = props.state.employees.find((item) => item.id === employeeId); return { id: uid("schedule"), employeeId, unitId: props.state.units[0]?.id, departmentId: props.state.departments[0]?.id, scheduleType: employee?.role ?? "Comercial integral", entrada: employee?.schedule.entrada ?? "08:00", saida_intervalo: employee?.schedule.saida_intervalo ?? "12:00", retorno_intervalo: employee?.schedule.retorno_intervalo ?? "14:00", saida_final: employee?.schedule.saida_final ?? "18:00", toleranceMinutes: employee?.toleranceMinutes ?? 15, dailyHours: 8, workDays: ["Seg", "Ter", "Qua", "Qui", "Sex"], managerId: props.state.employees[0]?.id, active: true }; }
function blankEmployee(props: FeaturePageProps): Employee { return { id: uid("emp"), organizationId: props.state.organizations[0]?.id, unit: props.state.units[0]?.id ?? "", department: props.state.departments[0]?.id ?? "", managerId: props.state.employees[0]?.id, name: "Novo colaborador", cpf: "", pinHash: "1234", role: "funcionario", sector: "Operacional", email: "", phone: "", baseSalary: 0, hourlyRate: 0, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Presencial", contractType: "CLT", workDays: ["Seg", "Ter", "Qua", "Qui", "Sex"], toleranceMinutes: 15, status: "Ativo", score: 100 }; }

export function EquipePage(props: FeaturePageProps) {
  const { state, commit, notify } = props;
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<PointSchedule | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const present = new Set(state.timeRecords.filter((record) => record.date === todayIso() && record.kind === "entrada").map((record) => record.employeeId));
  const masters = state.employees.filter((employee) => /sócio|admin|diretor|master/i.test(`${employee.role} ${employee.sector}`)).length;
  const workload = state.employees.map((employee) => {
    const tasks = state.tasks.filter((task) => task.responsible === employee.id || task.reviewer === employee.id || task.delegatedBy === employee.id);
    const done = tasks.filter((task) => task.status === "Concluída").length;
    const late = tasks.filter((task) => task.status === "Atrasada" || (task.due < todayIso() && task.status !== "Concluída")).length;
    return { employee, tasks, done, late, completion: tasks.length ? Math.round((done / tasks.length) * 100) : 100 };
  });

  const employeeOptions = state.employees.map((employee) => ({ value: employee.id, label: employee.name }));
  const unitOptions = state.units.map((unit) => ({ value: unit.id, label: unit.name }));
  const deptOptions = state.departments.map((dept) => ({ value: dept.id, label: dept.name }));
  const teamOptions = state.teams.map((team) => ({ value: team.id, label: team.name }));

  const unitFields: FieldConfig<Unit>[] = [
    { key: "name", label: "Nome da unidade" }, { key: "city", label: "Cidade" }, { key: "state", label: "UF" },
    { key: "managerId", label: "Gestor", kind: "select", options: employeeOptions }, { key: "status", label: "Status", kind: "select", options: ["Ativa", "Inativa"] },
  ];
  const deptFields: FieldConfig<Department>[] = [
    { key: "unitId", label: "Unidade", kind: "select", options: unitOptions }, { key: "name", label: "Departamento" }, { key: "legalArea", label: "Área" },
    { key: "managerId", label: "Gestor", kind: "select", options: employeeOptions }, { key: "status", label: "Status", kind: "select", options: ["Ativo", "Inativo"] },
  ];
  const teamFields: FieldConfig<Team>[] = [
    { key: "unitId", label: "Unidade", kind: "select", options: unitOptions }, { key: "departmentId", label: "Departamento", kind: "select", options: deptOptions },
    { key: "name", label: "Célula/equipe" }, { key: "coordinatorId", label: "Coordenador", kind: "select", options: employeeOptions }, { key: "legalArea", label: "Área jurídica" },
    { key: "capacity", label: "Capacidade mensal", kind: "number" }, { key: "status", label: "Status", kind: "select", options: ["Ativa", "Pausada", "Inativa"] },
  ];
  const memberFields: FieldConfig<TeamMember>[] = [
    { key: "teamId", label: "Equipe", kind: "select", options: teamOptions }, { key: "employeeId", label: "Colaborador", kind: "select", options: employeeOptions },
    { key: "role", label: "Papel", kind: "select", options: ["Sócio", "Coordenador", "Advogado", "Estagiário", "Assistente", "Financeiro", "RH", "Controladoria"] },
    { key: "workloadPercent", label: "Carga na equipe (%)", kind: "number", min: 0, max: 100 },
  ];
  const scheduleFields: FieldConfig<PointSchedule>[] = [
    { key: "employeeId", label: "Colaborador", kind: "select", options: employeeOptions }, { key: "unitId", label: "Unidade", kind: "select", options: unitOptions }, { key: "departmentId", label: "Departamento", kind: "select", options: deptOptions },
    { key: "scheduleType", label: "Tipo de jornada" }, { key: "entrada", label: "Entrada" }, { key: "saida_intervalo", label: "Saída almoço" }, { key: "retorno_intervalo", label: "Retorno almoço" }, { key: "saida_final", label: "Saída final" },
    { key: "toleranceMinutes", label: "Tolerância (min)", kind: "number" }, { key: "dailyHours", label: "Carga diária", kind: "number" }, { key: "managerId", label: "Gestor", kind: "select", options: employeeOptions },
  ];
  const employeeFields: FieldConfig<Employee>[] = [
    { key: "name", label: "Nome" }, { key: "role", label: "Cargo/perfil" }, { key: "sector", label: "Setor" }, { key: "unit", label: "Unidade" }, { key: "department", label: "Departamento" },
    { key: "managerId", label: "Gestor direto", kind: "select", options: employeeOptions }, { key: "email", label: "E-mail", kind: "email" }, { key: "phone", label: "Telefone" }, { key: "oab", label: "OAB" },
    { key: "contractType", label: "Tipo de contrato", kind: "select", options: ["CLT", "Associado", "Estágio", "Prestador", "Sócio"] }, { key: "mode", label: "Modalidade", kind: "select", options: ["Presencial", "Híbrido", "Remoto"] }, { key: "status", label: "Status", kind: "select", options: ["Ativo", "Férias", "Licença", "Inativo"] },
  ];

  async function save<K extends keyof Pick<typeof state, "units" | "departments" | "teams" | "teamMembers" | "pointSchedules" | "employees">>(entity: K, value: typeof state[K][number]) {
    const exists = (state[entity] as Array<{ id: string }>).some((item) => item.id === (value as { id: string }).id);
    await commit(entity, value as never, exists ? "update" : "create");
    notify({ tone: "success", title: entity === "employees" ? "Colaborador salvo" : "Estrutura salva", message: entity === "employees" ? "Funcionário salvo e perfil de acesso preparado." : "Hierarquia, escopo e gestão da equipe atualizados." });
  }

  async function promoteMaster(employee: Employee) {
    await commit("employees", { ...employee, role: "Admin Master", sector: "Administração Master" }, "update");
    await commit("auditLogs", { id: uid("audit"), module: "Equipe", action: "promover_admin_master", entityId: employee.id, user: "Admin Master", date: todayIso(), detail: `${employee.name} foi promovido para Admin Master.` });
    notify({ tone: "success", title: "Admin Master definido", message: `${employee.name} agora aparece com acesso total na hierarquia operacional.` });
  }

  return <div className="page-grid equipe-page">
    <div className="kpi-row">
      <Kpi icon={Building2} label="Unidades" value={state.units.length} note={`${state.departments.length} departamentos`} tone="blue" />
      <Kpi icon={Crown} label="Lideranças" value={masters} note="sócios/admin/gestores" tone="gold" />
      <Kpi icon={UsersRound} label="Presentes hoje" value={present.size} note="entrada registrada" tone="green" />
      <Kpi icon={ShieldCheck} label="Equipes/células" value={state.teams.length} note="gestão por área" tone="purple" />
    </div>

    <Panel>
      <PanelTitle title="Estrutura multiempresa, unidades, departamentos e células" subtitle="Gestão real para grandes escritórios: unidade, departamento, equipe, coordenador, capacidade e membros." action={<ActionBar><Button variant="gold" onClick={() => setEditingEmployee(blankEmployee(props))}><Plus size={15}/> Novo funcionário</Button><Button variant="ghost" onClick={() => setEditingUnit(blankUnit(props))}><Plus size={15}/> Unidade</Button><Button variant="ghost" onClick={() => setEditingDepartment(blankDepartment(props))}><Plus size={15}/> Departamento</Button><Button onClick={() => setEditingTeam(blankTeam(props))}><Plus size={15}/> Equipe</Button></ActionBar>} />
      <div className="data-grid">
        {state.units.map((unit) => <article className="data-card floating-card" key={unit.id}>
          <Building2 size={22}/><strong>{unit.name}</strong><small>{unit.city}/{unit.state} · gestor: {employeeLabel(state.employees.find((employee) => employee.id === unit.managerId))}</small>
          <div className="card-tags"><StatusBadge tone={statusTone(unit.status)}>{unit.status}</StatusBadge><StatusBadge tone="blue">{state.departments.filter((dept) => dept.unitId === unit.id).length} departamentos</StatusBadge></div>
          <Button variant="ghost" onClick={() => setEditingUnit(unit)}>Editar unidade</Button>
        </article>)}
        {state.departments.map((dept) => <article className="data-card floating-card" key={dept.id}>
          <UserCog size={22}/><strong>{dept.name}</strong><small>{dept.legalArea} · gestor: {employeeLabel(state.employees.find((employee) => employee.id === dept.managerId))}</small>
          <div className="card-tags"><StatusBadge tone={statusTone(dept.status)}>{dept.status}</StatusBadge><StatusBadge tone="gold">{state.teams.filter((team) => team.departmentId === dept.id).length} células</StatusBadge></div>
          <Button variant="ghost" onClick={() => setEditingDepartment(dept)}>Editar departamento</Button>
        </article>)}
      </div>
    </Panel>

    <Panel>
      <PanelTitle title="Células jurídicas e delegação operacional" subtitle="O admin gere tarefas delegadas aos advogados; advogados gerem estagiários e auxiliares por célula." />
      <div className="data-grid">
        {state.teams.map((team) => {
          const members = state.teamMembers.filter((member) => member.teamId === team.id);
          const tasks = state.tasks.filter((task) => members.some((member) => member.employeeId === task.responsible || member.employeeId === task.delegatedBy || member.employeeId === task.reviewer));
          const late = tasks.filter((task) => task.status === "Atrasada" || (task.due < todayIso() && task.status !== "Concluída")).length;
          return <article className="performance-card" key={team.id}>
            <div><strong>{team.name}</strong><span>{team.legalArea} · coordenação: {employeeLabel(state.employees.find((employee) => employee.id === team.coordinatorId))}</span></div>
            <div className="mini-metrics"><b>{members.length}</b><small>membros</small><b>{tasks.length}</b><small>tarefas</small><b>{late}</b><small>atrasos</small></div>
            <ProgressBar value={team.capacity ? Math.min(100, Math.round((tasks.length / team.capacity) * 100)) : 0} color={late ? "gold" : "green"} />
            <div className="chip-cloud">{members.map((member) => <span key={member.id}>{employeeLabel(state.employees.find((e) => e.id === member.employeeId))} · {member.role}</span>)}</div>
            <ActionBar><Button variant="ghost" onClick={() => setEditingTeam(team)}>Editar equipe</Button><Button variant="ghost" onClick={() => setEditingMember(blankMember(team.id, props))}>Adicionar membro</Button></ActionBar>
          </article>;
        })}
      </div>
    </Panel>

    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Hierarquia de acesso" subtitle="Perfis mínimos do SaaS jurídico com menor privilégio e segregação de módulos sensíveis." />
        <div className="role-matrix">{enterpriseRoles.map((item) => <article className="data-card" key={item.role}><strong>{item.role}</strong><small>{item.scope}</small></article>)}</div>
      </Panel>
      <Panel>
        <PanelTitle title="Jornadas e escalas" subtitle="Configuração por colaborador para o Ponto Corporativo, tolerância, carga diária e gestor." action={<Button variant="ghost" onClick={() => setEditingSchedule(blankSchedule(state.employees[0]?.id ?? "", props))}><Plus size={15}/> Jornada</Button>} />
        <div className="stack-list">
          {state.pointSchedules.map((schedule) => <div className="data-card" key={schedule.id}>
            <strong>{employeeLabel(state.employees.find((employee) => employee.id === schedule.employeeId))}</strong><small>{schedule.scheduleType} · {schedule.entrada} / {schedule.saida_intervalo} / {schedule.retorno_intervalo} / {schedule.saida_final}</small>
            <div className="card-tags"><StatusBadge tone="blue">Tol. {schedule.toleranceMinutes} min</StatusBadge><StatusBadge tone="green">{schedule.dailyHours}h/dia</StatusBadge></div>
            <Button variant="ghost" onClick={() => setEditingSchedule(schedule)}>Editar jornada</Button>
          </div>)}
        </div>
      </Panel>
    </div>

    <Panel>
      <PanelTitle title="Desempenho individual e governança de perfil" subtitle="Acompanhamento por colaborador, tarefas delegadas, atrasos, score e promoção controlada para Admin Master." />
      <div className="performance-grid">
        {workload.map(({ employee, tasks, done, late, completion }) => <article className="performance-card" key={employee.id}>
          <div><strong>{employee.name}</strong><span>{employee.role} · {employee.sector}</span></div>
          <div className="mini-metrics"><b>{tasks.length}</b><small>tarefas</small><b>{done}</b><small>concluídas</small><b>{late}</b><small>atrasos</small></div>
          <ProgressBar value={completion} color={late ? "gold" : "green"} />
          <div className="card-tags"><StatusBadge tone={statusTone(employee.status)}>{employee.status}</StatusBadge><StatusBadge tone="blue">{employee.mode}</StatusBadge><StatusBadge tone="purple">Score {employee.score}</StatusBadge></div>
          <ActionBar><Button variant="ghost" onClick={() => setEditingEmployee(employee)}>Editar perfil</Button><Button variant="gold" onClick={() => promoteMaster(employee)}><Crown size={14}/> Tornar Admin Master</Button><Button variant="ghost" onClick={() => setEditingSchedule(state.pointSchedules.find((schedule) => schedule.employeeId === employee.id) ?? blankSchedule(employee.id, props))}>Jornada</Button></ActionBar>
        </article>)}
      </div>
    </Panel>

    {editingUnit && <EntityFormModal<Unit> open={!!editingUnit} title="Unidade / filial" value={editingUnit} fields={unitFields} onClose={() => setEditingUnit(null)} onSave={async (value) => { await save("units", value); setEditingUnit(null); }} />}
    {editingDepartment && <EntityFormModal<Department> open={!!editingDepartment} title="Departamento" value={editingDepartment} fields={deptFields} onClose={() => setEditingDepartment(null)} onSave={async (value) => { await save("departments", value); setEditingDepartment(null); }} />}
    {editingTeam && <EntityFormModal<Team> open={!!editingTeam} title="Equipe / célula jurídica" value={editingTeam} fields={teamFields} onClose={() => setEditingTeam(null)} onSave={async (value) => { await save("teams", value); setEditingTeam(null); }} />}
    {editingMember && <EntityFormModal<TeamMember> open={!!editingMember} title="Membro da equipe" value={editingMember} fields={memberFields} onClose={() => setEditingMember(null)} onSave={async (value) => { await save("teamMembers", value); setEditingMember(null); }} />}
    {editingSchedule && <EntityFormModal<PointSchedule> open={!!editingSchedule} title="Jornada do colaborador" subtitle="Usada pelo ponto para próxima marcação esperada, tolerância, atraso e justificativa." value={editingSchedule} fields={scheduleFields} onClose={() => setEditingSchedule(null)} onSave={async (value) => { await save("pointSchedules", { ...value, workDays: value.workDays?.length ? value.workDays : ["Seg", "Ter", "Qua", "Qui", "Sex"] }); setEditingSchedule(null); }} />}
    {editingEmployee && <EntityFormModal<Employee> open={!!editingEmployee} title="Perfil do colaborador" subtitle="Hierarquia, setor, gestor, contrato e status." value={editingEmployee} fields={employeeFields} onClose={() => setEditingEmployee(null)} onSave={async (value) => { await save("employees", value); setEditingEmployee(null); }} />}
  </div>;
}
