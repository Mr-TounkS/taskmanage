"use client"

import React, { useState, useMemo } from "react";
import { Task } from "@/app/type";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, Minus, ArrowDown } from "lucide-react";

interface CalendarViewProps {
    tasks: Task[];
    email?: string;
}

type StatusFilter = "" | "To Do" | "In Progress" | "Done";
type PriorityFilter = "" | "LOW" | "MEDIUM" | "HIGH";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function taskBadgeClass(task: Task): string {
    if (task.status === "Done") return "bg-green-100 text-green-800 border-green-200";
    if (task.status === "In Progress") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (task.priority === "HIGH") return "bg-red-100 text-red-800 border-red-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
}

function PriorityIcon({ priority }: { priority?: string }) {
    if (priority === "HIGH") return <AlertTriangle className="w-2.5 h-2.5 shrink-0" />;
    if (priority === "LOW") return <ArrowDown className="w-2.5 h-2.5 shrink-0" />;
    return <Minus className="w-2.5 h-2.5 shrink-0" />;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, email }) => {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    // Filtrage des tâches selon les filtres actifs
    const filteredTasks = useMemo(() => tasks.filter(task => {
        if (!task.dueDate) return false;
        if (statusFilter && task.status !== statusFilter) return false;
        if (priorityFilter && (task.priority || "MEDIUM") !== priorityFilter) return false;
        if (myTasksOnly && task.user?.email !== email) return false;
        return true;
    }), [tasks, statusFilter, priorityFilter, myTasksOnly, email]);

    // Indexation des tâches par jour du mois
    const tasksByDay = useMemo(() => {
        const map: Record<number, Task[]> = {};
        filteredTasks.forEach(task => {
            const d = new Date(task.dueDate!);
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(task);
            }
        });
        return map;
    }, [filteredTasks, currentYear, currentMonth]);

    // Construction de la grille calendrier (6 semaines max)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDayOfMonth).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const isToday = (day: number) =>
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

    const totalThisMonth = useMemo(() => {
        return filteredTasks.filter(t => {
            const d = new Date(t.dueDate!);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;
    }, [filteredTasks, currentYear, currentMonth]);

    return (
        <div className="flex flex-col gap-4">
            {/* Barre de navigation + filtres */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Navigation mois */}
                <div className="flex items-center gap-3">
                    <button onClick={prevMonth} className="btn btn-ghost btn-sm btn-circle">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-lg font-semibold w-44 text-center">
                        {MONTHS[currentMonth]} {currentYear}
                    </h2>
                    <button onClick={nextMonth} className="btn btn-ghost btn-sm btn-circle">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="badge badge-ghost text-xs">{totalThisMonth} task{totalThisMonth !== 1 ? "s" : ""}</span>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                        className="select select-sm select-bordered focus:outline-none"
                    >
                        <option value="">All statuses</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}
                        className="select select-sm select-bordered focus:outline-none"
                    >
                        <option value="">All priorities</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    {email && (
                        <button
                            onClick={() => setMyTasksOnly(v => !v)}
                            className={`btn btn-sm ${myTasksOnly ? "btn-primary" : "btn-ghost border border-base-300"}`}
                        >
                            My tasks
                        </button>
                    )}
                    <button
                        onClick={() => { setStatusFilter(""); setPriorityFilter(""); setMyTasksOnly(false); }}
                        className="btn btn-ghost btn-sm text-base-content/50"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Grille calendrier */}
            <div className="border border-base-300 rounded-xl overflow-hidden">
                {/* En-têtes jours */}
                <div className="grid grid-cols-7 border-b border-base-300 bg-base-200">
                    {DAYS.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Cellules */}
                <div className="grid grid-cols-7 divide-x divide-y divide-base-300">
                    {cells.map((day, idx) => {
                        const dayTasks = day ? (tasksByDay[day] || []) : [];
                        const maxVisible = 3;
                        const overflow = dayTasks.length - maxVisible;

                        return (
                            <div
                                key={idx}
                                className={`min-h-[90px] p-1.5 flex flex-col gap-1 ${!day ? "bg-base-100/50" : "bg-base-100 hover:bg-base-200/50 transition-colors"}`}
                            >
                                {day && (
                                    <>
                                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0
                                            ${isToday(day) ? "bg-primary text-primary-content" : "text-base-content/70"}`}>
                                            {day}
                                        </span>
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            {dayTasks.slice(0, maxVisible).map(task => (
                                                <Link
                                                    key={task.id}
                                                    href={`/task-details/${task.id}`}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs truncate hover:opacity-80 transition-opacity ${taskBadgeClass(task)}`}
                                                    title={task.name}
                                                >
                                                    <PriorityIcon priority={task.priority} />
                                                    <span className="truncate">{task.name}</span>
                                                </Link>
                                            ))}
                                            {overflow > 0 && (
                                                <span className="text-xs text-base-content/40 pl-1">
                                                    +{overflow} more
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Légende */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
                <span className="font-medium">Legend:</span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> High priority
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" /> In Progress
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Done
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> To Do
                </span>
            </div>
        </div>
    );
};

export default CalendarView;
