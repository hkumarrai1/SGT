import Institution from "../models/Institution.js";

export async function listActiveInstitutions(req, res) {
  const institutions = await Institution.find({ active: true })
    .select("_id name shortName city emailDomain")
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    institutions: institutions.map(({ _id, ...institution }) => ({
      id: _id.toString(),
      ...institution,
    })),
  });
}
