import React, { useEffect,  useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getStoredToken } from "../../../services/auth";

const API_URL = "http://localhost:3000";

type VitalDraft = {
    systolic_bp: number | null;
    diastolic_bp: number | null;
    pulse_rate: number | null;
    spo2: number | null;
    temperature: number | null;
    respiratory_rate: number | null;
    source_text: string;
};

type MedicationDraft = {
    drug_name: string;
    dosage: string | null;
    route: string | null;
    notes: string | null;
    source_text: string;
};

type NursingNoteDraft = {
    note_type: string;
    content: string;
    source_text: string;
};

type ClinicalEventDraft = {
    event_type: string;
    description: string;
    doctor_notified: boolean;
    doctor_name: string | null;
    doctor_id: number | null;
    immediate_action: string | null;
    event_time_text: string | null;
    source_text: string;
};

type ConsumableDraft = {
    name: string;
    consumable_id: number | null;
    quantity: number;
    used_for_type: string | null;
    source_text: string;
};

type DoctorOption = {
    doctor_id: number;
    full_name: string;
    specialization: string | null;
};

type ConsumableOption = {
    consumable_id: number;
    name: string;
    unit: string;
};

type DocumentationDraft = {
    vitals: VitalDraft[];
    medications: MedicationDraft[];
    nursing_notes: NursingNoteDraft[];
    clinical_events: ClinicalEventDraft[];
    consumables: ConsumableDraft[];
};

function Dropdown({
    value,
    options,
    placeholder,
    onSelect,
}: {
    value: string;
    options: string[];
    placeholder: string;
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <View>
            <Pressable
                style={styles.dropdown}
                onPress={() => setOpen(!open)}
            >
                <Text style={styles.dropdownText}>
                    {value || placeholder}
                </Text>

                <Text style={styles.dropdownArrow}>
                    {open ? "▲" : "▼"}
                </Text>
            </Pressable>

            {open && (
                <View style={styles.dropdownOptions}>
                    {options.map((option) => (
                        <Pressable
                            key={option}
                            style={styles.dropdownOption}
                            onPress={() => {
                                onSelect(option);
                                setOpen(false);
                            }}
                        >
                            <Text style={styles.dropdownOptionText}>
                                {option}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function DocumentationScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [text, setText] = useState("");
    const [draft, setDraft] = useState<DocumentationDraft | null>(
        null
    );
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [consumables, setConsumables] = useState<ConsumableOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    async function loadOptions() {
    try {
        setOptionsLoading(true);

        const token = await getStoredToken();

        if (!token) {
            Alert.alert(
                "Authentication required",
                "Please log in again."
            );
            return;
        }

        const [doctorsResponse, consumablesResponse] =
            await Promise.all([
                fetch(`${API_URL}/api/nurse/doctors`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),

                fetch(`${API_URL}/api/nurse/consumables`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),
            ]);

        const doctorsData = await doctorsResponse.json();
        const consumablesData =
            await consumablesResponse.json();

        if (!doctorsResponse.ok) {
            throw new Error(
                doctorsData.message ||
                    "Failed to load doctors."
            );
        }

        if (!consumablesResponse.ok) {
            throw new Error(
                consumablesData.message ||
                    "Failed to load consumables."
            );
        }

        setDoctors(doctorsData.doctors ?? []);
        setConsumables(
            consumablesData.consumables ?? []
        );
    } catch (error) {
        console.error(
            "Load documentation options error:",
            error
        );

        Alert.alert(
            "Error",
            error instanceof Error
                ? error.message
                : "Failed to load documentation options."
        );
    } finally {
        setOptionsLoading(false);
    }
}

useEffect(() => {
    loadOptions();
}, []);

    async function generateDraft() {
        if (!text.trim()) {
            Alert.alert(
                "Documentation required",
                "Please enter some nursing documentation first."
            );generateDraft
            return;
        }

        try {
            setLoading(true);
            setDraft(null);
            

            const token = await getStoredToken();

            if (!token) {
                Alert.alert(
                    "Authentication required",
                    "Please log in again."
                );
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/documentation/parse`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        text: text.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to generate documentation draft."
                );
            }

            setDraft({
                ...data.draft,
                clinical_events: data.draft.clinical_events.map(
                    (event: ClinicalEventDraft) => ({
                        ...event,
                        doctor_id: null,
                    })
                ),
                consumables: data.draft.consumables.map(
                    (consumable: ConsumableDraft) => ({
                        ...consumable,
                        consumable_id: null,
                    })
                ),
            });

setEditing(true);
        } catch (error) {
            console.error(
                "Documentation draft error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to generate documentation draft."
            );
        } finally {
            setLoading(false);
        }
    }

    async function saveDraft() {
    if (!draft) {
        return;
    }

    // Validate medication fields before sending to backend.
    for (const medication of draft.medications) {
        if (
            !medication.drug_name.trim() ||
            !medication.dosage?.trim() ||
            !medication.route?.trim()
        ) {
            Alert.alert(
                "Incomplete medication",
                "Please provide medication name, dosage and route."
            );
            return;
        }
    }

    // Validate nursing notes.
    for (const note of draft.nursing_notes) {
        if (
            !note.note_type.trim() ||
            !note.content.trim()
        ) {
            Alert.alert(
                "Incomplete nursing note",
                "Please provide note type and content."
            );
            return;
        }
    }

    // Validate clinical events.
    for (const event of draft.clinical_events) {
        if (
            !event.event_type.trim() ||
            !event.description.trim()
        ) {
            Alert.alert(
                "Incomplete clinical event",
                "Please provide event type and description."
            );
            return;
        }
    }

    // Validate doctors for doctor-notification events.
    for (const event of draft.clinical_events) {
        if (event.doctor_notified && !event.doctor_id) {
            Alert.alert(
                "Doctor not selected",
                `Please select a doctor for "${event.description}".`
            );
            return;
        }
    }


    // Validate consumables.
    for (const consumable of draft.consumables) {
        if (!consumable.consumable_id) {
            Alert.alert(
                "Consumable not selected",
                `Please select a valid consumable for "${consumable.name}".`
            );
            return;
        }

        if (consumable.quantity <= 0) {
            Alert.alert(
                "Invalid consumable quantity",
                "Please provide a quantity greater than zero."
            );
            return;
        }
    }

    try {
        setLoading(true);

        const token = await getStoredToken();

        if (!token) {
            Alert.alert(
                "Authentication required",
                "Please log in again."
            );
            return;
        }

        const response = await fetch(
            `${API_URL}/api/nurse/documentation/save/${admissionId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vitals: draft.vitals.map((vital) => ({
                        systolic_bp: vital.systolic_bp,
                        diastolic_bp: vital.diastolic_bp,
                        pulse_rate: vital.pulse_rate,
                        spo2: vital.spo2,
                        temperature: vital.temperature,
                        respiratory_rate:
                            vital.respiratory_rate,
                    })),

                    medications: draft.medications.map(
                        (medication) => ({
                            drug_name:
                                medication.drug_name.trim(),
                            dosage:
                                medication.dosage?.trim() || "",
                            route:
                                medication.route?.trim() || "",
                            notes:
                                medication.notes?.trim() || null,
                        })
                    ),

                    nursing_notes: draft.nursing_notes.map(
                        (note) => ({
                            note_type:
                                note.note_type.trim(),
                            content:
                                note.content.trim(),
                        })
                    ),

                    clinical_events:
                        draft.clinical_events.map(
                            (event) => (
                                {
                                    event_type: event.event_type.trim(),
                                    description: event.description.trim(),
                                    immediate_action:
                                        event.immediate_action?.trim() || null,
                                    doctor_notified:
                                        event.doctor_notified,
                                    doctor_id: event.doctor_id,
                                }
                            )
                        ),

                    consumables:
                        draft.consumables.map(
                            (consumable) => (
                                {
                                    consumable_id: consumable.consumable_id,
                                    quantity: consumable.quantity,
                                    used_for_type:
                                        consumable.used_for_type?.trim() || null,
                                }
                            )
                        ),
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                    "Failed to save nursing documentation."
            );
        }

        Alert.alert(
            "Documentation Saved",
            "The reviewed nursing documentation has been saved successfully.",
            [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]
        );
    } catch (error) {
        console.error(
            "Save nursing documentation error:",
            error
        );

        Alert.alert(
            "Save Failed",
            error instanceof Error
                ? error.message
                : "Could not save nursing documentation."
        );
    } finally {
        setLoading(false);
    }
}

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>
                        ← Back
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    AI Documentation
                </Text>

                <Text style={styles.subtitle}>
                    Patient ID: {admissionId}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Nursing Documentation
                    </Text>

                    <Text style={styles.helperText}>
                        Enter the patient's information naturally.
                        You can mention vitals, medications, notes,
                        clinical events, and consumables in any order.
                    </Text>

                    <TextInput
                        style={styles.textInput}
                        value={text}
                        onChangeText={setText}
                        placeholder="Example: Patient complained of dizziness. BP was 120 over 80, pulse 76 and SpO2 98. Paracetamol 500 mg was given orally. I informed Dr Test Doctor. Used 2 syringes."
                        multiline
                        textAlignVertical="top"
                    />

                    <Pressable
                        style={[
                            styles.generateButton,
                            loading && styles.disabledButton,
                        ]}
                        onPress={generateDraft}
                        disabled={loading}
                    >
                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color="#ffffff" />
                                <Text style={styles.buttonText}>
                                    Generating...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>
                                Generate Documentation Draft
                            </Text>
                        )}
                    </Pressable>
                </View>

                {draft && (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>
                Review Documentation Draft
            </Text>

            <Text style={styles.reviewText}>
                Review and correct the information extracted by AI.
                Nothing will be saved until you confirm.
            </Text>

        {draft.vitals.length > 0 && (
            <View style={styles.category}>
                <Text style={styles.categoryTitle}>
                    Vitals
                </Text>

                {draft.vitals.map((vital, index) => (
                    <View
                        key={`vital-${index}`}
                        style={styles.item}
                    >
                            <Text style={styles.fieldLabel}>
                                Systolic BP
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={
                                    vital.systolic_bp === null
                                        ? ""
                                        : String(vital.systolic_bp)
                                }
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        vitals: [...draft.vitals],
                                    };

                                    updated.vitals[index] = {
                                        ...updated.vitals[index],
                                        systolic_bp:
                                            value === ""
                                                ? null
                                                : Number(value),
                                    };

                                    setDraft(updated);
                                }}
                                keyboardType="numeric"
                            />

                            <Text style={styles.fieldLabel}>
                                Diastolic BP
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={
                                    vital.diastolic_bp === null
                                        ? ""
                                        : String(vital.diastolic_bp)
                                }
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        vitals: [...draft.vitals],
                                    };

                                    updated.vitals[index] = {
                                        ...updated.vitals[index],
                                        diastolic_bp:
                                            value === ""
                                                ? null
                                                : Number(value),
                                    };

                                    setDraft(updated);
                                }}
                                keyboardType="numeric"
                            />

                            <Text style={styles.fieldLabel}>
                                Pulse
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={
                                    vital.pulse_rate === null
                                        ? ""
                                        : String(vital.pulse_rate)
                                }
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        vitals: [...draft.vitals],
                                    };

                                    updated.vitals[index] = {
                                        ...updated.vitals[index],
                                        pulse_rate:
                                            value === ""
                                                ? null
                                                : Number(value),
                                    };

                                    setDraft(updated);
                                }}
                                keyboardType="numeric"
                            />

                            <Text style={styles.fieldLabel}>
                                SpO₂
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={
                                    vital.spo2 === null
                                        ? ""
                                        : String(vital.spo2)
                                }
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        vitals: [...draft.vitals],
                                    };

                                    updated.vitals[index] = {
                                        ...updated.vitals[index],
                                        spo2:
                                            value === ""
                                                ? null
                                                : Number(value),
                                    };

                                    setDraft(updated);
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                    ))}
                </View>
            )}

            {draft.medications.length > 0 && (
                <View style={styles.category}>
                    <Text style={styles.categoryTitle}>
                        Medications
                    </Text>

                    {draft.medications.map((medication, index) => (
                        <View
                            key={`med-${index}`}
                            style={styles.item}
                        >
                            <Text style={styles.fieldLabel}>
                                Medication
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={medication.drug_name}
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        medications: [
                                            ...draft.medications,
                                        ],
                                    };

                                    updated.medications[index] = {
                                        ...updated.medications[index],
                                        drug_name: value,
                                    };

                                    setDraft(updated);
                                }}
                            />

                            <Text style={styles.fieldLabel}>
                                Dosage
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={medication.dosage ?? ""}
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        medications: [
                                            ...draft.medications,
                                        ],
                                    };

                                    updated.medications[index] = {
                                        ...updated.medications[index],
                                        dosage:
                                            value === ""
                                                ? null
                                                : value,
                                    };

                                    setDraft(updated);
                                }}
                            />

                            <Text style={styles.fieldLabel}>
                                Route
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={medication.route ?? ""}
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        medications: [
                                            ...draft.medications,
                                        ],
                                    };

                                    updated.medications[index] = {
                                        ...updated.medications[index],
                                        route:
                                            value === ""
                                                ? null
                                                : value,
                                    };

                                    setDraft(updated);
                                }}
                            />
                        </View>
                    ))}
                </View>
            )}

            {draft.nursing_notes.length > 0 && (
            <View style={styles.category}>
                <Text style={styles.categoryTitle}>
                    Nursing Notes
                </Text>

                {draft.nursing_notes.map((note, index) => (
                    <View
                        key={`note-${index}`}
                        style={styles.item}
                    >
                        <Text style={styles.fieldLabel}>
                            Note Type
                        </Text>

                        <TextInput
                            style={styles.editInput}
                            value={note.note_type}
                            onChangeText={(value) => {
                                const updated = {
                                    ...draft,
                                    nursing_notes: [
                                        ...draft.nursing_notes,
                                    ],
                                };

                                updated.nursing_notes[index] = {
                                    ...updated.nursing_notes[index],
                                    note_type: value,
                                };

                                setDraft(updated);
                            }}
                        />

                        <Text style={styles.fieldLabel}>
                            Note
                        </Text>

                        <TextInput
                            style={[
                                styles.editInput,
                                styles.multilineInput,
                            ]}
                            value={note.content}
                            onChangeText={(value) => {
                                const updated = {
                                    ...draft,
                                    nursing_notes: [
                                        ...draft.nursing_notes,
                                    ],
                                };

                                updated.nursing_notes[index] = {
                                    ...updated.nursing_notes[index],
                                    content: value,
                                };

                                setDraft(updated);
                            }}
                            multiline
                        />
                    </View>
                ))}
            </View>
        )}

            {draft.clinical_events.length > 0 && (
                <View style={styles.category}>
                    <Text style={styles.categoryTitle}>
                        Clinical Events
                    </Text>

                    {draft.clinical_events.map((event, index) => (
                        <View
                            key={`event-${index}`}
                            style={styles.item}
                        >
                            <Text style={styles.fieldLabel}>
                                Event Type
                            </Text>

                            <TextInput
                                style={styles.editInput}
                                value={event.event_type}
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        clinical_events: [
                                            ...draft.clinical_events,
                                        ],
                                    };

                                    updated.clinical_events[index] = {
                                        ...updated.clinical_events[index],
                                        event_type: value,
                                    };

                                    setDraft(updated);
                                }}
                            />

                            <Text style={styles.fieldLabel}>
                                Description
                            </Text>

                            <TextInput
                                style={[
                                    styles.editInput,
                                    styles.multilineInput,
                                ]}
                                value={event.description}
                                onChangeText={(value) => {
                                    const updated = {
                                        ...draft,
                                        clinical_events: [
                                            ...draft.clinical_events,
                                        ],
                                    };

                                    updated.clinical_events[index] = {
                                        ...updated.clinical_events[index],
                                        description: value,
                                    };

                                    setDraft(updated);
                                }}
                                multiline
                            />

                            <Text style={styles.fieldLabel}>
                                Doctor
                            </Text>

                            <Dropdown
                                value={event.doctor_id ? event.doctor_name ?? "" : ""}
                                placeholder="Select doctor"
                                options={doctors.map(
                                    (doctor) => doctor.full_name
                                )}
                                onSelect={(value) => {
                                    const selectedDoctor = doctors.find(
                                        (doctor) =>
                                            doctor.full_name === value
                                    );

                                    const updated = {
                                        ...draft,
                                        clinical_events: [
                                            ...draft.clinical_events,
                                        ],
                                    };

                                    updated.clinical_events[index] = {
                                        ...updated.clinical_events[index],
                                        doctor_name: value,
                                        doctor_id:
                                            selectedDoctor?.doctor_id ?? null,
                                    };

                                    setDraft(updated);
                                }}
                            />
                        </View>
                    ))}
                </View>
            )}

            {draft.consumables.length > 0 && (
                <View style={styles.category}>
                    <Text style={styles.categoryTitle}>
                        Consumables
                    </Text>

                    {draft.consumables.map(
                        (consumable, index) => (
                            <View
                                key={`consumable-${index}`}
                                style={styles.item}
                            >
                                <Text style={styles.fieldLabel}>
                                    Consumable
                                </Text>

                               <Dropdown
                                    value={
                                        consumable.consumable_id
                                            ? consumable.name
                                            : ""
                                    }
                                    placeholder="Select consumable"
                                    options={consumables.map(
                                        (item) => item.name
                                    )}
                                    onSelect={(value) => {
                                        const selectedConsumable = consumables.find(
                                            (item) => item.name === value
                                        );

                                        const updated = {
                                            ...draft,
                                            consumables: [
                                                ...draft.consumables,
                                            ],
                                        };

                                        updated.consumables[index] = {
                                            ...updated.consumables[index],
                                            name: value,
                                            consumable_id:
                                                selectedConsumable?.consumable_id ?? null,
                                        };

                                        setDraft(updated);
                                    }}
                                />

                                <Text style={styles.fieldLabel}>
                                    Quantity
                                </Text>

                                <TextInput
                                    style={styles.editInput}
                                    value={String(
                                        consumable.quantity
                                    )}
                                    onChangeText={(value) => {
                                        const updated = {
                                            ...draft,
                                            consumables: [
                                                ...draft.consumables,
                                            ],
                                        };

                                        updated.consumables[index] = {
                                            ...updated.consumables[index],
                                            quantity:
                                                value === ""
                                                    ? 0
                                                    : Number(value),
                                        };

                                        setDraft(updated);
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        )
                    )}
                </View>
            )}

            <View style={styles.reviewBox}>
                <Text style={styles.reviewBoxText}>
                    AI-generated information is still a draft.
                    Nothing has been saved.
                </Text>
            </View>

            <Pressable
                style={[
                    styles.saveButton,
                    loading && styles.disabledButton,
                ]}
                onPress={saveDraft}
                disabled={loading}
            >
                {loading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={styles.buttonText}>
                            Saving...
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.buttonText}>
                        Confirm & Save Documentation
                    </Text>
                )}
            </Pressable>
        </View>
    )}
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    header: {
        backgroundColor: "#ffffff",
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#dddddd",
    },

    backButton: {
        marginBottom: 12,
    },

    backText: {
        fontSize: 16,
    },

    title: {
        fontSize: 26,
        fontWeight: "700",
    },

    subtitle: {
        marginTop: 5,
        color: "#666666",
    },

    content: {
        padding: 16,
        paddingBottom: 40,
    },

    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#dddddd",
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
    },

    helperText: {
        color: "#666666",
        lineHeight: 20,
        marginBottom: 14,
    },

    reviewText: {
        color: "#666666",
        lineHeight: 20,
        marginBottom: 12,
    },

    textInput: {
        minHeight: 180,
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fafafa",
    },

    generateButton: {
        backgroundColor: "#111111",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 14,
    },

    disabledButton: {
        opacity: 0.6,
    },

    buttonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },

    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    category: {
        marginTop: 16,
    },

    categoryTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 8,
    },

    item: {
        backgroundColor: "#f8f8f8",
        borderWidth: 1,
        borderColor: "#dddddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },

    itemText: {
        fontSize: 15,
        lineHeight: 21,
        marginBottom: 2,
    },

    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#555555",
        marginBottom: 5,
        marginTop: 8,
    },

    editInput: {
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
        fontSize: 15,
        backgroundColor: "#ffffff",
    },

    saveButton: {
        backgroundColor: "#1f7a4d",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 14,
    },

    multilineInput: {
        minHeight: 70,
        textAlignVertical: "top",
    },
    reviewBox: {
        marginTop: 18,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#eeeeee",
    },

    reviewBoxText: {
        fontSize: 14,
        color: "#555555",
        lineHeight: 20,
    },
    dropdown: {
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 12,
        backgroundColor: "#ffffff",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    dropdownText: {
        fontSize: 15,
        color: "#222222",
    },

    dropdownArrow: {
        fontSize: 12,
        color: "#555555",
    },

    dropdownOptions: {
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: 8,
        marginTop: 4,
        backgroundColor: "#ffffff",
        overflow: "hidden",
    },

    dropdownOption: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eeeeee",
    },

    dropdownOptionText: {
        fontSize: 15,
        color: "#222222",
    },
});