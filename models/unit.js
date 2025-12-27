"use strict";

module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define(
    "Unit",
    {
      unitCode: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
        allowNull: false,
      },
      unitName: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },

      staffId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "Units",
      timestamps: true,
    }
  );

  Unit.associate = (models) => {
    Unit.belongsTo(models.User, { foreignKey: "staffId", as: "Staff" });
    Unit.hasMany(models.Marks, { foreignKey: "unitCode" });
    Unit.hasMany(models.Enrollment, { foreignKey: "unitCode" });
  };

  return Unit;
};
