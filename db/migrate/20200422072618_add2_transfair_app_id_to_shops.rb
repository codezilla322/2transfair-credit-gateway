class Add2TransfairAppIdToShops < ActiveRecord::Migration[6.0]
  def change
    add_column :shops, :app_id_2transfair, :string
  end
end
