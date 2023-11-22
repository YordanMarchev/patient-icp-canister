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

type Patient = Record<{
  id: string;
  firstName: string;
  lastName: string;
  birthDate: nat64;
  status: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type PatientPayload = Record<{
  firstName: string;
  lastName: string;
  birthDate: nat64;
}>;

const patientsStorage = new StableBTreeMap<string, Patient>(1, 44, 1024);

// Patients
$update;
export function addPatient(payload: PatientPayload): Result<Patient, string> {
  if (!isValidPatient(payload.firstName, payload.lastName))
    return Result.Err<Patient, string>(
      `Couldn't add Patient. First or Last name is invalid`
    );

  const patientToAdd: Patient = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,

    firstName: payload.firstName,
    lastName: payload.lastName,
    birthDate: payload.birthDate,
    status: "active",
  };

  patientsStorage.insert(patientToAdd.id, patientToAdd);

  return Result.Ok(patientToAdd);
}

$update;
export function updatePatient(
  id: string,
  payload: PatientPayload
): Result<Patient, string> {
  if (!isValidPatient(payload.firstName, payload.lastName))
    return Result.Err<Patient, string>(
      `Couldn't update Patient. First or Last name is invalid`
    );

  return match(patientsStorage.get(id), {
    Some: (patient) => {
      const patientToUpdate: Patient = {
        ...patient,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };
      patientsStorage.insert(patient.id, patientToUpdate);
      return Result.Ok<Patient, string>(patientToUpdate);
    },
    None: () =>
      Result.Err<Patient, string>(
        `Couldn't update Patient with id=${id}. Patient not found.`
      ),
  });
}

$update;
export function deletePatient(id: string): Result<Patient, string> {
  return match(patientsStorage.remove(id), {
    Some: (deletedPatient) => Result.Ok<Patient, string>(deletedPatient),
    None: () =>
      Result.Err<Patient, string>(
        `Couldn't delete Patient with id=${id}. Patient not found.`
      ),
  });
}

$update;
export function updatePatientStatus(
  id: string,
  status: string
): Result<string, string> {
  return match(patientsStorage.get(id), {
    Some: (patient) => {
      if (isValidStatus(status)) {
        const patientToUpdate: Patient = { ...patient, status: status };

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
}

$query;
export function getPatient(id: string): Result<Patient, string> {
  return match(patientsStorage.get(id), {
    Some: (patient) => Result.Ok<Patient, string>(patient),
    None: () =>
      Result.Err<Patient, string>(
        `Couldn't get Patient with id=${id}. Patient not found.`
      ),
  });
}

$query;
export function getPatients(): Result<Vec<Patient>, string> {
  return Result.Ok(patientsStorage.values());
}

$query;
export function getPatientsByStatus(
  status: string
): Result<Vec<Patient>, string> {
  if (!isValidStatus(status))
    return Result.Err<Vec<Patient>, string>(
      `Couldn't get Patients. Status is invalid`
    );

  const filteredPatients = patientsStorage.values().filter((patient) => {
    return patient.status == status;
  });
  return Result.Ok(filteredPatients);
}

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
