import {
    Button,
    Group,
    PasswordInput,
    Stack,
    TextInput,
} from '@mantine/core'
import { useState } from 'react'
import axios from 'axios'

export default function SBHRegister({
    selectedRepo,
    onComplete,
    goBack,
}) {
    const [fullName, setFullName] = useState('')
    const [affiliation, setAffiliation] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleRegister = async () => {
        setError('')

        if (!fullName.trim()) {
            setError('Full Name is required.')
            return
        }

        if (!email.trim()) {
            setError('Email Address is required.')
            return
        }

        if (!username.trim()) {
            setError('User Name is required.')
            return
        }

        if (!password) {
            setError('Password is required.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (!selectedRepo) {
            setError('No SynBioHub repository selected.')
            return
        }

        setIsSubmitting(true)

        try {
            const params = new URLSearchParams()

            params.append('name', fullName.trim())
            params.append('affiliation', affiliation.trim())
            params.append('email', email.trim())
            params.append('username', username.trim())
            params.append('password1', password)
            params.append('password2', confirmPassword)

            const baseUrl = selectedRepo.replace(/\/+$/, '')

            await axios.post(
                `${baseUrl}/register`,
                params,
                {
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded',
                    },
                }
            )

            onComplete?.({
                completed: true,
                username: username.trim(),
                email: email.trim(),
            })
        } catch (err) {
            console.error('SynBioHub registration failed:', err)

            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                (typeof err?.response?.data === 'string'
                    ? err.response.data
                    : null) ||
                err.message ||
                'Unable to register with SynBioHub.'

            setError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Stack>
            <TextInput
                label="Full Name"
                placeholder="Full Name"
                required
                value={fullName}
                onChange={event =>
                    setFullName(event.currentTarget.value)
                }
            />

            <TextInput
                label="Affiliation"
                placeholder="Affiliation"
                description="Optional"
                value={affiliation}
                onChange={event =>
                    setAffiliation(event.currentTarget.value)
                }
            />

            <TextInput
                label="Email Address"
                placeholder="name@example.com"
                type="email"
                required
                value={email}
                onChange={event =>
                    setEmail(event.currentTarget.value)
                }
            />

            <TextInput
                label="User Name"
                placeholder="User Name"
                required
                value={username}
                onChange={event =>
                    setUsername(event.currentTarget.value)
                }
            />

            <PasswordInput
                label="Password"
                required
                value={password}
                onChange={event =>
                    setPassword(event.currentTarget.value)
                }
            />

            <PasswordInput
                label="Confirm Password"
                required
                value={confirmPassword}
                onChange={event =>
                    setConfirmPassword(event.currentTarget.value)
                }
            />

            {error && (
                <div style={{ color: 'red', fontSize: 14 }}>
                    {error}
                </div>
            )}

            <Group position="apart" mt="md">
                {goBack && (
                    <Button
                        variant="default"
                        onClick={goBack}
                        disabled={isSubmitting}
                    >
                        Back
                    </Button>
                )}

                <Button
                    onClick={handleRegister}
                    loading={isSubmitting}
                    ml={goBack ? 0 : 'auto'}
                >
                    Register
                </Button>
            </Group>
        </Stack>
    )
}