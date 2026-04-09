'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateMemberSchema } from '@/lib/schemas/companies/MemberManagementForm';
import styles from '@/styles/pages/companies/member-edit.module.scss';

type EditFormValues = {
    role: 'admin' | 'member';
};

interface EditMemberFormProps {
    companyId: string;
    memberId: string;
    slug: string;
    displayName: string;
    username: string;
    currentRole: 'admin' | 'member';
    canRemove: boolean;
}

const ClientEditSchema = UpdateMemberSchema.pick({ role: true });

export default function EditMemberForm({
    companyId,
    memberId,
    slug,
    displayName,
    username,
    currentRole,
    canRemove,
}: EditMemberFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [removing, setRemoving] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<EditFormValues>({
        resolver: zodResolver(ClientEditSchema),
        defaultValues: { role: currentRole },
    });

    async function onSubmit(values: EditFormValues) {
        setServerError('');
        setSuccessMessage('');

        const response = await fetch('/api/companies/members/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_id: companyId,
                member_id: memberId,
                role: values.role,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setServerError(data.error ?? 'Failed to update member role');
            return;
        }

        setSuccessMessage('Member role updated successfully.');
        router.refresh();
    }

    async function handleRemove() {
        if (!canRemove) return;

        const confirmed = window.confirm(`Remove ${displayName} from this company?`);
        if (!confirmed) return;

        setRemoving(true);
        setServerError('');

        const response = await fetch('/api/companies/members/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_id: companyId,
                member_id: memberId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setServerError(data.error ?? 'Failed to remove member');
            setRemoving(false);
            return;
        }

        router.push(`/companies/s/${slug}/members`);
        router.refresh();
    }

    return (
        <div className={styles.page}>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Member role</h2>
                    <p className={styles.sectionDesc}>
                        Adjust permissions for {displayName} (@{username}).
                    </p>
                </div>
                <div className={styles.sectionBody}>
                    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
                        {serverError && <p className={styles.serverError}>{serverError}</p>}
                        {successMessage && <p className={styles.saveSuccess}>{successMessage}</p>}

                        <div className={styles.field}>
                            <label htmlFor="role">Role</label>
                            <select id="role" className={styles.select} {...register('role')}>
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                            {errors.role && <p className={styles.fieldError}>{errors.role.message}</p>}
                            <p className={styles.hint}>Owners can manage company settings and other members.</p>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => router.push(`/companies/s/${slug}/members/${memberId}`)}
                            >
                                Back
                            </button>
                            <button type="submit" className={styles.saveBtn} disabled={isSubmitting || !isDirty}>
                                {isSubmitting ? 'Saving...' : 'Save role'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {canRemove && (
                <section className={`${styles.section} ${styles.dangerSection}`}>
                    <div className={styles.sectionHeader}>
                        <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Danger zone</h2>
                        <p className={styles.sectionDesc}>This action removes member access to this company.</p>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.dangerRow}>
                            <div>
                                <p className={styles.dangerLabel}>Remove member</p>
                                <p className={styles.dangerHint}>
                                    This removes company membership. Workspace access inherited through membership will also be revoked.
                                </p>
                            </div>
                            <button type="button" className={styles.deleteBtn} onClick={handleRemove} disabled={removing}>
                                {removing ? 'Removing...' : 'Remove member'}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
