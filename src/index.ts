import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the Patient type for storing Patient information
type Patient = Record<{
  id: string;
  firstName: string;
  lastName: string;
  birthDate: nat64;
  status: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the PatientPayload type for creating or updating patients
type PatientPayload = Record<{
  firstName: string;
  lastName: string;
  birthDate: nat64;
}>;

// Create StableBTreeMap to store patients
const patientsStorage = new StableBTreeMap<string, Patient>(1, 44, 1024);

// Patients

$update;
// Function to add a new patient
export function addPatient(payload: PatientPayload): Result<Patient, string> {
  try {
    // Validate patient data before creating a new patient
    if (!isValidPatient(payload.firstName, payload.lastName))
      return Result.Err<Patient, string>(
        `Couldn't add Patient. First or Last name is invalid`
      );

    // Create a new patient record
    const patientToAdd: Patient = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthDate: payload.birthDate,
      status: "active",
    };

    // Insert the new patient into the storage
    patientsStorage.insert(patientToAdd.id, patientToAdd);

    return Result.Ok(patientToAdd);
  } catch (error) {
    return Result.Err<Patient, string>(`Failed to add patient: ${error}`);
  }
}

$update;
// Function to update an existing patient
export function updatePatient(
  id: string,
  payload: PatientPayload
): Result<Patient, string> {
  try {
    // Validate patient ID and data before updating
    if (!id || typeof id !== "string")
      return Result.Err<Patient, string>("Invalid patient ID");

    if (!isValidPatient(payload.firstName, payload.lastName))
      return Result.Err<Patient, string>(
        `Couldn't update Patient. First or Last name is invalid`
      );

    return match(patientsStorage.get(id), {
      Some: (patient) => {
        // Create an updated patient record
        const patientToUpdate: Patient = {
          ...patient,
          ...payload,
          updatedAt: Opt.Some(ic.time()),
        };

        // Update the patient in the storage
        patientsStorage.insert(patient.id, patientToUpdate);

        return Result.Ok<Patient, string>(patientToUpdate);
      },
      None: () =>
        Result.Err<Patient, string>(
          `Couldn't update Patient with id=${id}. Patient not found.`
        ),
    });
  } catch (error) {
    return Result.Err<Patient, string>(`Failed to update patient: ${error}`);
  }
}

$update;
// Function to delete an existing patient
export function deletePatient(id: string): Result<Patient, string> {
  try {
    // Validate patient ID before deletion
    if (!id || typeof id !== "string")
      return Result.Err<Patient, string>("Invalid patient ID");

    return match(patientsStorage.remove(id), {
      Some: (deletedPatient) => Result.Ok<Patient, string>(deletedPatient),
      None: () =>
        Result.Err<Patient, string>(
          `Couldn't delete Patient with id=${id}. Patient not found.`
        ),
    });
  } catch (error) {
    return Result.Err<Patient, string>(`Failed to delete patient: ${error}`);
  }
}

$update;
// Function to update the status of an existing patient
export function updatePatientStatus(
  id: string,
  status: string
): Result<string, string> {
  try {
    // Validate patient ID before updating status
    if (!id || typeof id !== "string")
      return Result.Err<string, string>("Invalid patient ID");

    return match(patientsStorage.get(id), {
      Some: (patient) => {
        // Check if the provided status is valid
        if (isValidStatus(status)) {
          // Create an updated patient record with the new status
          const patientToUpdate: Patient = { ...patient, status: status };

          // Update the patient in the storage
          patientsStorage.insert(patient.id, patientToUpdate);

          return Result.Ok<string, string>(status);
        } else
          return Result.Err<string, string>(
            `Couldn't update Patient with id=${id}. Status is invalid.`
          );
      },
      None: () =>
        Result.Err<string, string>(
          `Couldn't update Patient with id=${id}. Patient not found.`
        ),
    });
  } catch (error) {
    return Result.Err<string, string>(
      `Failed to update patient status: ${error}`
    );
  }
}

$query;
// Function to get details of a specific patient by ID
export function getPatient(id: string): Result<Patient, string> {
  try {
    // Validate patient ID before retrieval
    if (!id || typeof id !== "string")
      return Result.Err<Patient, string>("Invalid patient ID");

    return match(patientsStorage.get(id), {
      Some: (patient) => Result.Ok<Patient, string>(patient),
      None: () =>
        Result.Err<Patient, string>(
          `Couldn't get Patient with id=${id}. Patient not found.`
        ),
    });
  } catch (error) {
    return Result.Err<Patient, string>(`Failed to get patient: ${error}`);
  }
}

$query;
// Function to get details of all patients
export function getPatients(): Result<Vec<Patient>, string> {
  try {
    // Retrieve all patients from the storage
    return Result.Ok(patientsStorage.values());
  } catch (error) {
    return Result.Err<Vec<Patient>, string>(`Failed to get patients: ${error}`);
  }
}

$query;
// Function to get details of patients filtered by status
export function getPatientsByStatus(
  status: string
): Result<Vec<Patient>, string> {
  try {
    // Validate status before filtering
    if (!isValidStatus(status))
      return Result.Err<Vec<Patient>, string>(
        `Couldn't get Patients. Status is invalid`
      );

    // Filter patients by the provided status
    const filteredPatients = patientsStorage.values().filter((patient) => {
      return patient.status == status;
    });

    return Result.Ok(filteredPatients);
  } catch (error) {
    return Result.Err<Vec<Patient>, string>(
      `Failed to get patients by status: ${error}`
    );
  }
}

// Validate patient name and status
function isValidPatient(firstName: string, lastName: string): boolean {
  return firstName.trim().length > 0 && lastName.trim().length > 0;
}

function isValidStatus(value: string): boolean {
  return value === "active" || value === "inactive";
}




// a workaround to make uuid package work with Azle
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};
