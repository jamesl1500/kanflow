"use client";

import { useState } from "react";
import cn from "clsx";
import styles from "@/styles/pages/settings.module.scss";
import BasicInfoTab from "@/components/settings/BasicInfoTab";
import ChangeEmailTab from "@/components/settings/ChangeEmailTab";
import ChangePasswordTab from "@/components/settings/ChangePasswordTab";
import DestroyAccountTab from "@/components/settings/DestroyAccountTab";

const TABS = [
    { id: "basic-info", label: "Basic Info" },
    { id: "change-email", label: "Change Email" },
    { id: "change-password", label: "Change Password" },
    { id: "destroy-account", label: "Destroy Account" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SettingsTabsProps {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
}

export default function SettingsTabs({ firstName, lastName, username, email }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>("basic-info");

    return (
        <div>
            <div className={styles.tabList} role="tablist">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`panel-${tab.id}`}
                        className={cn(styles.tabButton, { [styles.active]: activeTab === tab.id })}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div id={`panel-${activeTab}`} role="tabpanel">
                {activeTab === "basic-info" && (
                    <BasicInfoTab firstName={firstName} lastName={lastName} username={username} />
                )}
                {activeTab === "change-email" && <ChangeEmailTab currentEmail={email} />}
                {activeTab === "change-password" && <ChangePasswordTab />}
                {activeTab === "destroy-account" && <DestroyAccountTab />}
            </div>
        </div>
    );
}
