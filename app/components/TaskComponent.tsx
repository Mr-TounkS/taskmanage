import React, { FC } from "react";
import { Task } from "../type";
import UserInfo from "./UserInfo";
import Link from "next/link";
import { ArrowRight, Trash, AlertTriangle, Minus, ArrowDown } from "lucide-react";

interface TaskProps {
    task : Task,
    index : number,
    email? : string,
    onDelete? : (id: string) => void
}

const TaskComponent: FC<TaskProps> = ({task, index, email, onDelete}) => {

    const canDelete = email == task.createdBy?.email
    
    const handleDeleteClick = () => {
        if (onDelete) {
            onDelete(task.id)
        }
    }
    return (
        <>
        <td>{index + 1}</td>

        <td className="flex flex-col gap-1">
            {/* Titre en haut */}
            <span className="text-sm font-bold">
               {task.name.length > 100 ? `${task.name.slice(0, 100)}...` : task.name}
            </span>
            {/* Statut + priorité en bas */}
            <div className="flex items-center gap-1 flex-wrap">
                <div className={`badge text-xs font-semibold
                ${task.status == "To Do" ? "bg-red-200" : ""}
                ${task.status == "In Progress" ? "bg-yellow-200" : ""}
                ${task.status == "Done" ? "bg-green-200" : ""}
                `}>
                    {task.status == "To Do" && "To Do"}
                    {task.status == "In Progress" && "In Progress"}
                    {task.status == "Done" && "Done"}
                </div>
                {/* Badge priorité */}
                {task.priority === 'HIGH' && (
                    <span className="badge badge-error badge-sm gap-1">
                        <AlertTriangle className="w-3 h-3" /> High
                    </span>
                )}
                {(!task.priority || task.priority === 'MEDIUM') && (
                    <span className="badge badge-warning badge-sm gap-1">
                        <Minus className="w-3 h-3" /> Medium
                    </span>
                )}
                {task.priority === 'LOW' && (
                    <span className="badge badge-success badge-sm gap-1">
                        <ArrowDown className="w-3 h-3" /> Low
                    </span>
                )}
            </div>
        </td>

        <td>
            <UserInfo
            role={""}
            email={task.user?.email || null}
            name={task.user?.name || null}
            imageUrl={task.user?.imageUrl || null}/>
        </td>

        <td>
            <div className="text-xs text-gray-500 tabular-nums">
                {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
            </div>
        </td>

        <td>
            <div className="text-xs text-gray-500 tabular-nums">
                {task.startDate && new Date(task.startDate).toLocaleDateString()}
            </div>
        </td>

        <td>
           <div className="flex h-fit">
                <Link
                className="btn btn-primary"
                href={`/task-details/${task.id}`}>
                    Plus
                    <ArrowRight className="w-4"/>
                </Link>
                {canDelete && (
                    <button onClick={handleDeleteClick} className="btn btn-sm ml-2">
                        <Trash className="w-4"/>
                    </button>
                )}
           </div>
        </td>
        </>
    )
}

export default TaskComponent