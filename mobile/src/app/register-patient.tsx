import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { getStoredToken } from "../services/auth";

import { API_URL } from "../constants/api";

type Doctor = {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
};

type Ward = {
  ward_id: number;
  ward_name: string;
  ward_type: string | null;
};

type Bed = {
  bed_id: number;
  bed_number: string;
  ward_id: number;
  ward_name: string;
};

const genderOptions = ["Male", "Female", "Other"];

const relationshipOptions = [
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Sibling",
  "Other",
];

const payerOptions = ["SELF", "INSURANCE", "GOVERNMENT"];

export default function RegisterPatientScreen() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [gender, setGender] = useState("");

  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");

  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [doctorId, setDoctorId] = useState("");
  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");

  const [chiefComplaint, setChiefComplaint] = useState("");

  const [payerType, setPayerType] = useState("");
  const [insuranceDetails, setInsuranceDetails] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const token = await getStoredToken();

      const response = await fetch(`${API_URL}/api/admissions/options`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load admission options");
      }

      setDoctors(data.doctors);
      setWards(data.wards);
      setBeds(data.availableBeds);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load options");
    }
  }

  function handleDateChange(
  event: any,
  selectedDate?: Date
) {
  setShowDatePicker(false);

  if (!selectedDate) {
    return;
  }

  const today = new Date();

  if (selectedDate > today) {
    Alert.alert("Invalid date", "Date of birth cannot be in the future.");
    return;
  }

  setDobDate(selectedDate);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");

  setDateOfBirth(`${year}-${month}-${day}`);
}

  function validateForm(): string | null {
    if (!firstName.trim()) {
      return "Please enter the patient's first name.";
    }

    if (!emergencyContactName.trim()) {
      return "Please enter the emergency contact name.";
    }

    if (!emergencyContactRelationship) {
      return "Please select the emergency contact relationship.";
    }

    if (!emergencyContactPhone.trim()) {
      return "Please enter the emergency contact phone number.";
    }

    if (!doctorId) {
      return "Please select the admitting doctor.";
    }

    if (!wardId) {
      return "Please select a ward.";
    }

    if (!bedId) {
      return "Please select a bed.";
    }

    if (!payerType) {
      return "Please select the payer type.";
    }

    if (payerType === "INSURANCE" && !insuranceDetails.trim()) {
      return "Please enter the insurance details.";
    }

    if (
      contactNumber.trim() &&
      (contactNumber.length < 10 || contactNumber.length > 15)
    ) {
      return "Please enter a valid patient contact number.";
    }

    if (
      emergencyContactPhone.length < 10 ||
      emergencyContactPhone.length > 15
    ) {
      return "Please enter a valid emergency contact number.";
    }

    return null;
  }

  async function handleSubmit() {
    const validationError = validateForm();

    if (validationError) {
      Alert.alert("Check details", validationError);
      return;
    }

    try {
      setLoading(true);

      const token = await getStoredToken();

      const response = await fetch(`${API_URL}/api/admissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          contactNumber: contactNumber.trim() || undefined,
          address: address.trim() || undefined,

          emergencyContactName: emergencyContactName.trim(),
          emergencyContactRelationship,
          emergencyContactPhone: emergencyContactPhone.trim(),

          doctorId,
          wardId,
          bedId,

          chiefComplaint: chiefComplaint.trim() || undefined,

          payerType,
          insuranceDetails:
            payerType === "INSURANCE"
              ? insuranceDetails.trim()
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to admit patient");
      }

      Alert.alert(
        "Patient admitted",
        `Patient admitted successfully.\n\nUHID: ${data.uhid}`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/reception-dashboard"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Admission failed",
        error.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedWardBeds = beds.filter(
    (bed) => String(bed.ward_id) === wardId
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Register / Admit Patient</Text>

        <Text style={styles.sectionTitle}>Patient Information</Text>

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter first name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter last name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Date of Birth</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text
            style={
              dateOfBirth
                ? styles.dateText
                : styles.datePlaceholder
            }
          >
            {dateOfBirth || "Select date of birth"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dobDate || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onValueChange={handleDateChange}
        />
        )}

        <Text style={styles.label}>Gender</Text>

        <View style={styles.chipContainer}>
          {genderOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                gender === option && styles.selectedChip,
              ]}
              onPress={() => setGender(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  gender === option && styles.selectedChipText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter contact number"
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Text style={styles.label}>Permanent Address</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Enter permanent address"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <Text style={styles.sectionTitle}>
          Emergency Contact
        </Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Emergency contact name"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Relationship *</Text>

        <View style={styles.chipContainer}>
          {relationshipOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                emergencyContactRelationship === option &&
                  styles.selectedChip,
              ]}
              onPress={() =>
                setEmergencyContactRelationship(option)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  emergencyContactRelationship === option &&
                    styles.selectedChipText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          placeholder="Emergency contact phone"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Text style={styles.sectionTitle}>
          Admission Information
        </Text>

        <Text style={styles.label}>Admitting Doctor *</Text>

        {doctors.map((doctor) => (
          <TouchableOpacity
            key={doctor.doctor_id}
            style={[
              styles.optionButton,
              doctorId === String(doctor.doctor_id) &&
                styles.selectedOption,
            ]}
            onPress={() => setDoctorId(String(doctor.doctor_id))}
          >
            <Text
              style={[
                styles.optionTitle,
                doctorId === String(doctor.doctor_id) &&
                  styles.selectedOptionText,
              ]}
            >
              {doctor.full_name}
            </Text>

            {doctor.specialization && (
              <Text style={styles.optionSubtitle}>
                {doctor.specialization}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Ward *</Text>

        {wards.map((ward) => (
          <TouchableOpacity
            key={ward.ward_id}
            style={[
              styles.optionButton,
              wardId === String(ward.ward_id) &&
                styles.selectedOption,
            ]}
            onPress={() => {
              setWardId(String(ward.ward_id));
              setBedId("");
            }}
          >
            <Text
              style={[
                styles.optionTitle,
                wardId === String(ward.ward_id) &&
                  styles.selectedOptionText,
              ]}
            >
              {ward.ward_name}
            </Text>

            {ward.ward_type && (
              <Text style={styles.optionSubtitle}>
                {ward.ward_type}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Available Bed *</Text>

        {!wardId ? (
          <Text style={styles.helperText}>
            Select a ward first.
          </Text>
        ) : selectedWardBeds.length === 0 ? (
          <Text style={styles.helperText}>
            No available beds in this ward.
          </Text>
        ) : (
          selectedWardBeds.map((bed) => (
            <TouchableOpacity
              key={bed.bed_id}
              style={[
                styles.optionButton,
                bedId === String(bed.bed_id) &&
                  styles.selectedOption,
              ]}
              onPress={() => setBedId(String(bed.bed_id))}
            >
              <Text
                style={[
                  styles.optionTitle,
                  bedId === String(bed.bed_id) &&
                    styles.selectedOptionText,
                ]}
              >
                Bed {bed.bed_number}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.label}>Chief Complaint</Text>

        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Enter patient's chief complaint"
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          multiline
        />

        <Text style={styles.label}>Payer Type *</Text>

        <View style={styles.chipContainer}>
          {payerOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                payerType === option && styles.selectedChip,
              ]}
              onPress={() => setPayerType(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  payerType === option &&
                    styles.selectedChipText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {payerType === "INSURANCE" && (
          <>
            <Text style={styles.label}>
              Insurance Details *
            </Text>

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Policy number / provider / other details"
              value={insuranceDetails}
              onChangeText={setInsuranceDetails}
              multiline
            />
          </>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Admitting Patient..." : "Admit Patient"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d5d9df",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  dateButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d5d9df",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  dateText: {
    fontSize: 15,
  },

  datePlaceholder: {
    fontSize: 15,
    color: "#888888",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    borderWidth: 1,
    borderColor: "#cfd4da",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: "#ffffff",
  },

  selectedChip: {
    backgroundColor: "#222222",
    borderColor: "#222222",
  },

  chipText: {
    fontSize: 14,
  },

  selectedChipText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  optionButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d5d9df",
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },

  selectedOption: {
    borderColor: "#222222",
    borderWidth: 2,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },

  selectedOptionText: {
    fontWeight: "700",
  },

  optionSubtitle: {
    fontSize: 13,
    color: "#666666",
    marginTop: 4,
  },

  helperText: {
    color: "#777777",
    fontSize: 14,
    marginBottom: 8,
  },

  submitButton: {
    backgroundColor: "#222222",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28,
  },

  disabledButton: {
    opacity: 0.5,
  },

  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },

  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});