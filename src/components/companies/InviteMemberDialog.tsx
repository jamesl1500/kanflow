'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styles from '@/styles/pages/companies/members.module.scss';

const ClientInviteSchema = z
    .object({
        invite_method: z.enum(['username', 'email']),
        user_name: z.string().trim().optional(),
        email: z.string().trim().optional(),
        role: z.enum(['admin', 'member']),
    })
    .superRefine((values, ctx) => {
        if (values.invite_method === 'username') {
            const username = values.user_name ?? '';
            if (username.length < 3) {
                ctx.addIssue({ code: 'custom', path: ['user_name'], message: 'Username must be at least 3 characters' });
                return;
            }
            if (username.length > 32) {
                ctx.addIssue({ code: 'custom', path: ['user_name'], message: 'Username must be 32 characters or less' });
                return;
            }
            if (!/^[a-zA-Z0-9_\.]+$/.test(username)) {
                ctx.addIssue({ code: 'custom', path: ['user_name'], message: 'Username can only contain letters, numbers, underscore, and dot' });
            }
            return;
        }

        const email = values.email ?? '';
        if (!email) {
            ctx.addIssue({ code: 'custom', path: ['email'], message: 'Please enter a valid email' });
            return;
        }
        if (!z.string().email().safeParse(email).success) {
            ctx.addIssue({ code: 'custom', path: ['email'], message: 'Please enter a valid email' });
        }
    });

type InviteFormValues = z.infer<typeof ClientInviteSchema>;

interface InviteMemberDialogProps {
    companyId: string;
    canInvite: boolean;
}

export default function InviteMemberDialog({ companyId, canInvite }: InviteMemberDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [signupLink, setSignupLink] = useState('');

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<InviteFormValues>({
        resolver: zodResolver(ClientInviteSchema),
        defaultValues: {
            invite_method: 'username',
            user_name: '',
            email: '',
            role: 'member',
        },
    });

    const inviteMethod = watch('invite_method');

    function closeDialog() {
        if (isSubmitting) return;
        setOpen(false);
        setServerError('');
        setSuccessMessage('');
        setSignupLink('');
        reset();
    }

    async function onSubmit(values: InviteFormValues) {
        setServerError('');
        setSuccessMessage('');
        setSignupLink('');

        const response = await fetch('/api/companies/members/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_id: companyId,
                invite_method: values.invite_method,
                user_name: values.user_name,
                email: values.email,
                role: values.role,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setServerError(data.error ?? 'Unable to send invite');
            return;
        }

        if (data.invite_method === 'email') {
            setSuccessMessage('Email invite created. Share the signup link below.');
            setSignupLink(data.signup_url ?? '');
            reset({
                invite_method: values.invite_method,
                user_name: '',
                email: values.email ?? '',
                role: values.role,
            });
            router.refresh();
            return;
        }

        closeDialog();
        router.refresh();
    }

    if (!canInvite) {
        return (
            <button type="button" className={styles.primaryBtn} disabled title="Only owners and admins can invite members.">
                Invite member
            </button>
        );
    }

    return (
        <>
            <button type="button" className={styles.primaryBtn} onClick={() => setOpen(true)}>
                Invite member
            </button>

            {open && (
                <div className={styles.modalOverlay} onClick={closeDialog}>
                    <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>Invite member</h3>
                                <p>Invite by username for instant add, or by email for signup-based access.</p>
                            </div>
                            <button type="button" className={styles.modalClose} onClick={closeDialog} aria-label="Close dialog">
                                x
                            </button>
                        </div>

                        <form className={styles.modalBody} onSubmit={handleSubmit(onSubmit)} noValidate>
                            <div className={styles.modalToggle}>
                                <label>
                                    <input type="radio" value="username" {...register('invite_method')} />
                                    Username
                                </label>
                                <label>
                                    <input type="radio" value="email" {...register('invite_method')} />
                                    Email
                                </label>
                            </div>

                            <div className={styles.modalField}>
                                {inviteMethod === 'username' ? (
                                    <>
                                        <label htmlFor="user_name">Username</label>
                                        <input
                                            id="user_name"
                                            placeholder="jordan.lee"
                                            {...register('user_name')}
                                            aria-invalid={!!errors.user_name}
                                        />
                                        {errors.user_name && <p className={styles.modalError}>{errors.user_name.message}</p>}
                                    </>
                                ) : (
                                    <>
                                        <label htmlFor="email">Email</label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="jordan@example.com"
                                            {...register('email')}
                                            aria-invalid={!!errors.email}
                                        />
                                        {errors.email && <p className={styles.modalError}>{errors.email.message}</p>}
                                    </>
                                )}
                            </div>

                            <div className={styles.modalField}>
                                <label htmlFor="role">Role</label>
                                <select id="role" {...register('role')} aria-invalid={!!errors.role}>
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {errors.role && <p className={styles.modalError}>{errors.role.message}</p>}
                            </div>

                            {serverError && <p className={styles.modalError}>{serverError}</p>}
                            {successMessage && <p className={styles.modalSuccess}>{successMessage}</p>}
                            
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.modalCancelBtn} onClick={closeDialog} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.modalSaveBtn} disabled={isSubmitting}>
                                    {isSubmitting ? 'Inviting...' : 'Send invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
